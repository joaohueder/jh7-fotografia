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
  valor_custo: number;
  valor_venda: number;
  created_at: string;
}

export interface ServicoPayload {
  nome: string;
  status: ServicoStatus;
  valor_custo: number;
  valor_venda: number;
}

/** Lista os serviços da empresa em contexto, com atualização em tempo real. */
export function useServicos() {
  const { data: empresaId } = useEmpresaAtual();
  const qc = useQueryClient();

  useEffect(() => {
    const invalidar = () =>
      qc.invalidateQueries({ queryKey: ["servicos"], refetchType: "active" });

    const channel = supabase
      .channel("servicos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "servicos" }, invalidar)
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
        .select("id, empresa_id, nome, status, valor_custo, valor_venda, created_at")
        .eq("empresa_id", empresaId!)
        .order("nome", { ascending: true });
      if (error) throw error;

      return ((data ?? []) as any[]).map((s) => ({
        ...s,
        valor_custo: Number(s.valor_custo ?? 0),
        valor_venda: Number(s.valor_venda ?? 0),
      })) as Servico[];
    },
  });
}

/** Cria ou atualiza um serviço da empresa. */
export function useSalvarServico() {
  const qc = useQueryClient();
  const { data: empresaId } = useEmpresaAtual();

  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: ServicoPayload }) => {
      const valores = {
        nome: dados.nome.trim(),
        status: dados.status,
        valor_custo: dados.valor_custo,
        valor_venda: dados.valor_venda,
      };

      if (id) {
        const { error } = await db.from("servicos").update(valores).eq("id", id);
        if (error) throw error;
        return id;
      }

      if (!empresaId) throw new Error("Empresa não identificada para o cadastro.");

      const { data, error } = await db
        .from("servicos")
        .insert({ ...valores, empresa_id: empresaId })
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicos"], refetchType: "active" });
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
