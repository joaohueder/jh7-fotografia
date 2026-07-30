import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";
import { useEmpresaAtual } from "@/hooks/use-clientes";

// Tabelas do Supabase autohospedado (fora dos tipos gerados).
const db = supabase as unknown as SupabaseClient;

export type GrupoServicoStatus = "ATIVO" | "INATIVO";

/** Produto que compõe um serviço (exibido no detalhamento do agrupamento). */
export interface ProdutoDoServico {
  nome: string;
  quantidade: number;
}

/** Serviço do agrupamento, já com os produtos que o compõem. */
export interface ServicoDoGrupo {
  servico_id: string;
  nome: string;
  status: GrupoServicoStatus;
  valor_venda: number | null;
  produtos: ProdutoDoServico[];
}

export interface GrupoServico {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  status: GrupoServicoStatus;
  created_at: string;
  /** Quantidade de serviços dentro do agrupamento. */
  total_servicos: number;
  /** Soma dos valores de venda dos serviços do grupo (ignora os sem valor). */
  total_venda: number | null;
  /** Serviços do grupo, na ordem salva, com a composição de produtos. */
  servicos: ServicoDoGrupo[];
}

export interface GrupoServicoItem {
  id: string;
  servico_id: string;
  nome: string;
  status: GrupoServicoStatus;
  valor_venda: number | null;
  /** Produtos que compõem o serviço. */
  produtos: ProdutoDoServico[];
}


export interface GrupoServicoPayload {
  nome: string;
  descricao: string | null;
  status: GrupoServicoStatus;
  /** IDs dos serviços na ordem definida pelo usuário. */
  servicos: string[];
}

/** Lista os agrupamentos de serviços da empresa, com atualização em tempo real. */
export function useGruposServicos() {
  const { data: empresaId } = useEmpresaAtual();
  const qc = useQueryClient();

  useEffect(() => {
    const invalidar = () => {
      qc.invalidateQueries({ queryKey: ["servico-grupos"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["servico-grupo"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["servico-grupo-itens"], refetchType: "active" });
    };

    const channel = supabase
      .channel("servico-grupos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "servico_grupos" }, invalidar)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "servico_grupo_itens" },
        invalidar,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "servicos" }, invalidar)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["servico-grupos", empresaId],
    enabled: Boolean(empresaId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 20 * 1000,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<GrupoServico[]> => {
      const { data, error } = await db
        .from("servico_grupos")
        .select(
          "id, empresa_id, nome, descricao, status, created_at, servico_grupo_itens ( id, servicos ( valor_venda ) )",
        )
        .eq("empresa_id", empresaId!)
        .order("nome", { ascending: true });
      if (error) throw error;

      return ((data ?? []) as any[]).map((g) => {
        const itens = (g.servico_grupo_itens ?? []) as any[];
        const valores = itens
          .map((i) => (i.servicos?.valor_venda == null ? null : Number(i.servicos.valor_venda)))
          .filter((v): v is number => v != null);
        return {
          id: g.id,
          empresa_id: g.empresa_id,
          nome: g.nome,
          descricao: g.descricao ?? null,
          status: g.status,
          created_at: g.created_at,
          total_servicos: itens.length,
          total_venda: valores.length === 0 ? null : valores.reduce((s, v) => s + v, 0),
        } as GrupoServico;
      });
    },
  });
}

/** Busca um agrupamento específico (tela de edição). */
export function useGrupoServico(id?: string) {
  return useQuery({
    queryKey: ["servico-grupo", id],
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: async (): Promise<{
      id: string;
      nome: string;
      descricao: string | null;
      status: GrupoServicoStatus;
    } | null> => {
      const { data, error } = await db
        .from("servico_grupos")
        .select("id, nome, descricao, status")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const g = data as any;
      return { id: g.id, nome: g.nome, descricao: g.descricao ?? null, status: g.status };
    },
  });
}

/** Serviços que fazem parte de um agrupamento, na ordem salva. */
export function useGrupoServicoItens(grupoId?: string) {
  return useQuery({
    queryKey: ["servico-grupo-itens", grupoId],
    enabled: Boolean(grupoId),
    staleTime: 0,
    queryFn: async (): Promise<GrupoServicoItem[]> => {
      const { data, error } = await db
        .from("servico_grupo_itens")
        .select("id, servico_id, ordem, servicos ( nome, status, valor_venda )")
        .eq("grupo_id", grupoId!)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;

      return ((data ?? []) as any[]).map((item) => ({
        id: item.id,
        servico_id: item.servico_id,
        nome: item.servicos?.nome ?? "Serviço removido",
        status: (item.servicos?.status ?? "INATIVO") as GrupoServicoStatus,
        valor_venda: item.servicos?.valor_venda == null ? null : Number(item.servicos.valor_venda),
      }));
    },
  });
}

/** Cria ou atualiza um agrupamento junto da lista ordenada de serviços. */
export function useSalvarGrupoServico() {
  const qc = useQueryClient();
  const { data: empresaId } = useEmpresaAtual();

  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: GrupoServicoPayload }) => {
      const valores = {
        nome: dados.nome.trim(),
        descricao: dados.descricao?.trim() ? dados.descricao.trim() : null,
        status: dados.status,
      };

      let grupoId = id;
      let empresaDoGrupo = empresaId;

      if (grupoId) {
        const { data, error } = await db
          .from("servico_grupos")
          .update(valores)
          .eq("id", grupoId)
          .select("empresa_id")
          .single();
        if (error) throw error;
        empresaDoGrupo = (data as { empresa_id: string }).empresa_id;
      } else {
        if (!empresaId) throw new Error("Empresa não identificada para o cadastro.");
        const { data, error } = await db
          .from("servico_grupos")
          .insert({ ...valores, empresa_id: empresaId })
          .select("id, empresa_id")
          .single();
        if (error) throw error;
        grupoId = (data as { id: string }).id;
        empresaDoGrupo = (data as { empresa_id: string }).empresa_id;
      }

      // Regrava os itens do grupo respeitando a ordem escolhida.
      const { error: erroLimpeza } = await db
        .from("servico_grupo_itens")
        .delete()
        .eq("grupo_id", grupoId);
      if (erroLimpeza) throw erroLimpeza;

      if (dados.servicos.length > 0) {
        const { error: erroItens } = await db.from("servico_grupo_itens").insert(
          dados.servicos.map((servicoId, indice) => ({
            empresa_id: empresaDoGrupo,
            grupo_id: grupoId,
            servico_id: servicoId,
            ordem: indice,
          })),
        );
        if (erroItens) throw erroItens;
      }

      return grupoId as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servico-grupos"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["servico-grupo"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["servico-grupo-itens"], refetchType: "active" });
    },
  });
}

/** Ativa ou inativa um agrupamento. */
export function useSetGrupoServicoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: GrupoServicoStatus }) => {
      const { error } = await db.from("servico_grupos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servico-grupos"], refetchType: "active" });
    },
  });
}

export function useDeleteGrupoServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("servico_grupos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servico-grupos"], refetchType: "active" });
    },
  });
}
