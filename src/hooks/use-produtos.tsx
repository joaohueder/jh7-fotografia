import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";
import { useEmpresaAtual } from "@/hooks/use-clientes";

// Tabela do Supabase autohospedado (fora dos tipos gerados).
const db = supabase as unknown as SupabaseClient;

export type ProdutoStatus = "ATIVO" | "INATIVO";

export interface Produto {
  id: string;
  empresa_id: string;
  nome: string;
  status: ProdutoStatus;
  /** Pode ser nulo quando o custo ainda não é conhecido. */
  valor_custo: number | null;
  /** Pode ser nulo quando o preço de venda ainda não foi definido. */
  valor_venda: number | null;
  created_at: string;
}

export interface ProdutoPayload {
  nome: string;
  status: ProdutoStatus;
  valor_custo: number | null;
  valor_venda: number | null;
}


/** Lista os produtos da empresa em contexto, com atualização em tempo real. */
export function useProdutos() {
  const { data: empresaId } = useEmpresaAtual();
  const qc = useQueryClient();

  useEffect(() => {
    const invalidar = () =>
      qc.invalidateQueries({ queryKey: ["produtos"], refetchType: "active" });

    const channel = supabase
      .channel("produtos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, invalidar)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["produtos", empresaId],
    enabled: Boolean(empresaId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 20 * 1000,
    refetchIntervalInBackground: false,
    queryFn: async (): Promise<Produto[]> => {
      const { data, error } = await db
        .from("produtos")
        .select("id, empresa_id, nome, status, valor_custo, valor_venda, created_at")
        .eq("empresa_id", empresaId!)
        .order("nome", { ascending: true });
      if (error) throw error;

      return ((data ?? []) as any[]).map((p) => ({
        ...p,
        valor_custo: p.valor_custo ?? null,
        valor_venda: p.valor_venda ?? null,
      })) as Produto[];

    },
  });
}

/** Cria ou atualiza um produto da empresa. */
export function useSalvarProduto() {
  const qc = useQueryClient();
  const { data: empresaId } = useEmpresaAtual();

  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: ProdutoPayload }) => {
      const valores = {
        nome: dados.nome.trim(),
        status: dados.status,
        valor_custo: dados.valor_custo,
        valor_venda: dados.valor_venda,
      };

      if (id) {
        const { error } = await db.from("produtos").update(valores).eq("id", id);
        if (error) throw error;
        return id;
      }

      if (!empresaId) throw new Error("Empresa não identificada para o cadastro.");

      const { data, error } = await db
        .from("produtos")
        .insert({ ...valores, empresa_id: empresaId })
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"], refetchType: "active" });
    },
  });
}

/** Ativa ou inativa um produto. */
export function useSetProdutoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProdutoStatus }) => {
      const { error } = await db.from("produtos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"], refetchType: "active" });
    },
  });
}

export function useDeleteProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["produtos"], refetchType: "active" });
    },
  });
}
