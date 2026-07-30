import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";
import { useEmpresaAtual } from "@/hooks/use-clientes";

// Tabela do Supabase autohospedado (fora dos tipos gerados).
const db = supabase as unknown as SupabaseClient;

export type ServicoStatus = "ATIVO" | "INATIVO";

export interface Servico {
  id: string;
  empresa_id: string;
  nome: string;
  status: ServicoStatus;
  /** Custos que não vêm de produtos (mão de obra, deslocamento etc.). Opcional. */
  custo_adicional: number | null;
  /** Custo total = custo adicional + produtos da composição. Opcional. */
  valor_custo: number | null;
  valor_venda: number | null;
  created_at: string;
}

/** Produto que compõe um serviço. */
export interface ServicoProdutoItem {
  produto_id: string;
  quantidade: number;
}

export interface ServicoProdutoDetalhe extends ServicoProdutoItem {
  id: string;
  nome: string;
  valor_custo: number;
}

export interface ServicoPayload {
  nome: string;
  status: ServicoStatus;
  custo_adicional: number | null;
  valor_custo: number | null;
  valor_venda: number | null;
  produtos: ServicoProdutoItem[];
}

/** Lista os serviços da empresa em contexto, com atualização em tempo real. */
export function useServicos() {
  const { data: empresaId } = useEmpresaAtual();
  const qc = useQueryClient();

  useEffect(() => {
    const invalidar = () => {
      qc.invalidateQueries({ queryKey: ["servicos"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["servico-produtos"], refetchType: "active" });
    };

    const channel = supabase
      .channel("servicos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "servicos" }, invalidar)
      .on("postgres_changes", { event: "*", schema: "public", table: "servico_produtos" }, invalidar)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["servicos", empresaId],
    enabled: Boolean(empresaId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 20 * 1000,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<Servico[]> => {
      const { data, error } = await db
        .from("servicos")
        .select(
          "id, empresa_id, nome, status, custo_adicional, valor_custo, valor_venda, created_at",
        )
        .eq("empresa_id", empresaId!)
        .order("nome", { ascending: true });
      if (error) throw error;

      return ((data ?? []) as any[]).map((s) => ({
        ...s,
        custo_adicional: s.custo_adicional == null ? null : Number(s.custo_adicional),
        valor_custo: s.valor_custo == null ? null : Number(s.valor_custo),
        valor_venda: s.valor_venda == null ? null : Number(s.valor_venda),
      })) as Servico[];
    },
  });
}

/** Busca um serviço específico (usado na tela de edição). */
export function useServico(id?: string) {
  return useQuery({
    queryKey: ["servico", id],
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: async (): Promise<Servico | null> => {
      const { data, error } = await db
        .from("servicos")
        .select(
          "id, empresa_id, nome, status, custo_adicional, valor_custo, valor_venda, created_at",
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const s = data as any;
      return {
        ...s,
        custo_adicional: s.custo_adicional == null ? null : Number(s.custo_adicional),
        valor_custo: s.valor_custo == null ? null : Number(s.valor_custo),
        valor_venda: s.valor_venda == null ? null : Number(s.valor_venda),
      } as Servico;
    },
  });
}

/** Produtos que compõem um serviço, já com nome e custo do produto. */
export function useServicoProdutos(servicoId?: string) {
  return useQuery({
    queryKey: ["servico-produtos", servicoId],
    enabled: Boolean(servicoId),
    staleTime: 0,
    queryFn: async (): Promise<ServicoProdutoDetalhe[]> => {
      const { data, error } = await db
        .from("servico_produtos")
        .select("id, produto_id, quantidade, produtos ( nome, valor_custo )")
        .eq("servico_id", servicoId!);
      if (error) throw error;

      return ((data ?? []) as any[]).map((item) => ({
        id: item.id,
        produto_id: item.produto_id,
        quantidade: Number(item.quantidade ?? 0),
        nome: item.produtos?.nome ?? "Produto removido",
        valor_custo: Number(item.produtos?.valor_custo ?? 0),
      }));
    },
  });
}

/** Cria ou atualiza um serviço da empresa, junto da sua composição de produtos. */
export function useSalvarServico() {
  const qc = useQueryClient();
  const { data: empresaId } = useEmpresaAtual();

  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: ServicoPayload }) => {
      const valores = {
        nome: dados.nome.trim(),
        status: dados.status,
        custo_adicional: dados.custo_adicional,
        valor_custo: dados.valor_custo,
        valor_venda: dados.valor_venda,
      };

      let servicoId = id;
      let empresaDoServico = empresaId;

      if (servicoId) {
        const { data, error } = await db
          .from("servicos")
          .update(valores)
          .eq("id", servicoId)
          .select("empresa_id")
          .single();
        if (error) throw error;
        empresaDoServico = (data as { empresa_id: string }).empresa_id;
      } else {
        if (!empresaId) throw new Error("Empresa não identificada para o cadastro.");
        const { data, error } = await db
          .from("servicos")
          .insert({ ...valores, empresa_id: empresaId })
          .select("id, empresa_id")
          .single();
        if (error) throw error;
        servicoId = (data as { id: string }).id;
        empresaDoServico = (data as { empresa_id: string }).empresa_id;
      }

      // Sincroniza a composição: apaga o que saiu e regrava o que ficou.
      const { error: erroLimpeza } = await db
        .from("servico_produtos")
        .delete()
        .eq("servico_id", servicoId);
      if (erroLimpeza) throw erroLimpeza;

      if (dados.produtos.length > 0) {
        const { error: erroItens } = await db.from("servico_produtos").insert(
          dados.produtos.map((p) => ({
            empresa_id: empresaDoServico,
            servico_id: servicoId,
            produto_id: p.produto_id,
            quantidade: p.quantidade,
          })),
        );
        if (erroItens) throw erroItens;
      }

      return servicoId as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicos"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["servico"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["servico-produtos"], refetchType: "active" });
    },
  });
}

/** Ativa ou inativa um serviço. */
export function useSetServicoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ServicoStatus }) => {
      const { error } = await db.from("servicos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicos"], refetchType: "active" });
    },
  });
}

export function useDeleteServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("servicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicos"], refetchType: "active" });
    },
  });
}
