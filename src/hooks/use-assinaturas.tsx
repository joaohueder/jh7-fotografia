import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";

// Tabela do Supabase autohospedado (fora dos tipos gerados).
const db = supabase as unknown as SupabaseClient;

export interface Assinatura {
  id: string;
  empresa_id: string;
  plano_id: string | null;
  plano_nome: string;
  gratuito: boolean;
  valor: number | null;
  ativo: boolean;
  inicio: string;
  fim: string | null;
  observacao: string | null;
  created_at: string;
}

const COLUNAS =
  "id, empresa_id, plano_id, plano_nome, gratuito, valor, ativo, inicio, fim, observacao, created_at";

function normaliza(row: Record<string, unknown>): Assinatura {
  const valor = row.valor;
  return {
    ...(row as unknown as Assinatura),
    valor: valor === null || valor === undefined ? null : Number(valor),
  };
}

/** Mensagens amigáveis para as restrições do banco. */
function traduzErro(err: unknown) {
  const msg = (err as { message?: string })?.message ?? "";
  if (msg.includes("empresa_assinaturas_unica_ativa")) {
    return new Error("Esta empresa já possui uma assinatura ativa. Encerre-a antes de continuar.");
  }
  return err instanceof Error ? err : new Error(String(err));
}

/** Histórico completo de assinaturas da empresa (mais recentes primeiro). */
export function useAssinaturas(empresaId: string | undefined) {
  return useQuery({
    queryKey: ["empresa-assinaturas", empresaId ?? null],
    enabled: Boolean(empresaId),
    staleTime: 0,
    queryFn: async (): Promise<Assinatura[]> => {
      const { data, error } = await db
        .from("empresa_assinaturas")
        .select(COLUNAS)
        .eq("empresa_id", empresaId!)
        .order("ativo", { ascending: false })
        .order("inicio", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw traduzErro(error);
      return (data ?? []).map((r) => normaliza(r as Record<string, unknown>));
    },
  });
}

/** Contrata um plano encerrando automaticamente a assinatura ativa anterior. */
export function useDefinirAssinatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      empresaId: string;
      planoId: string;
      inicio?: string | null;
      observacao?: string | null;
    }) => {
      const { data, error } = await db.rpc("sa_definir_assinatura", {
        p_empresa_id: input.empresaId,
        p_plano_id: input.planoId,
        p_inicio: input.inicio || null,
        p_observacao: input.observacao || null,
      });
      if (error) throw traduzErro(error);
      return data as string;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["empresa-assinaturas", vars.empresaId] });
    },
  });
}

/** Encerra a assinatura ativa, deixando a empresa sem plano vigente. */
export function useEncerrarAssinatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; empresaId: string; observacao?: string | null }) => {
      const { error } = await db.rpc("sa_encerrar_assinatura", {
        p_id: input.id,
        p_observacao: input.observacao || null,
      });
      if (error) throw traduzErro(error);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["empresa-assinaturas", vars.empresaId] });
    },
  });
}
