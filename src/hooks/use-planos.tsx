import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";

// Tabela do Supabase autohospedado (fora dos tipos gerados).
const db = supabase as unknown as SupabaseClient;

export interface Plano {
  id: string;
  nome: string;
  ativo: boolean;
  gratuito: boolean;
  valor: number | null;
  ordem: number | null;
  created_at: string;
}


export interface PlanoInput {
  nome: string;
  ativo: boolean;
  gratuito: boolean;
  valor: number | null;
}

/** Mensagens amigáveis para as restrições do banco. */
function traduzErro(err: unknown) {
  const msg = (err as { message?: string })?.message ?? "";
  if (msg.includes("planos_unico_gratuito")) {
    return new Error(
      "Já existe um plano gratuito ativo. Inative ou altere o plano gratuito anterior antes de continuar.",
    );
  }
  if (msg.includes("planos_nome_unico") || msg.includes("duplicate key")) {
    return new Error("Já existe um plano com esse nome.");
  }
  if (msg.includes("planos_valor_coerente")) {
    return new Error("Informe um valor válido para planos pagos.");
  }
  return err instanceof Error ? err : new Error(String(err));
}

export interface PlanoUso {
  /** Empresas com assinatura ativa (vigente) neste plano. */
  ativas: number;
  /** Total de assinaturas já registradas para o plano (histórico). */
  total: number;
}

/**
 * Uso dos planos: empresas com assinatura vigente e histórico de assinaturas.
 * Usado para exibir o contador no card e bloquear exclusões indevidas.
 */
export function usePlanosUso() {
  return useQuery({
    queryKey: ["planos-uso"],
    queryFn: async (): Promise<Map<string, PlanoUso>> => {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data, error } = await db
        .from("empresa_assinaturas")
        .select("plano_id, ativo, fim");
      if (error) throw error;

      const mapa = new Map<string, PlanoUso>();
      for (const row of (data ?? []) as {
        plano_id: string | null;
        ativo: boolean;
        fim: string | null;
      }[]) {
        if (!row.plano_id) continue;
        const atual = mapa.get(row.plano_id) ?? { ativas: 0, total: 0 };
        atual.total += 1;
        const vigente = row.ativo && (row.fim === null || row.fim >= hoje);
        if (vigente) atual.ativas += 1;
        mapa.set(row.plano_id, atual);
      }
      return mapa;
    },
  });
}

/** Plano gratuito ativo já cadastrado (ignora o plano em edição). */
export function usePlanoGratuitoAtivo(ignorarId?: string) {
  return useQuery({
    queryKey: ["plano-gratuito-ativo", ignorarId ?? null],
    queryFn: async (): Promise<Plano | null> => {
      const { data, error } = await db
        .from("planos")
        .select(COLUNAS)
        .eq("gratuito", true)
        .eq("ativo", true);
      if (error) throw error;
      const lista = (data ?? []) as Plano[];
      return lista.find((p) => p.id !== ignorarId) ?? null;
    },
  });
}


const COLUNAS = "id, nome, ativo, gratuito, valor, ordem, created_at";

function normaliza(input: PlanoInput) {
  return {
    nome: input.nome,
    ativo: input.ativo,
    gratuito: input.gratuito,
    valor: input.gratuito ? null : input.valor,
  };
}

export function usePlanos() {
  return useQuery({
    queryKey: ["planos"],
    queryFn: async (): Promise<Plano[]> => {
      const { data, error } = await db
        .from("planos")
        .select(COLUNAS)
        .order("ordem", { ascending: true, nullsFirst: false })
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...(p as Plano),
        valor: p.valor === null || p.valor === undefined ? null : Number(p.valor),
      }));
    },
  });
}


export function usePlano(id: string | undefined) {
  return useQuery({
    queryKey: ["plano", id],
    enabled: Boolean(id),
    // Sempre busca o registro atual ao abrir a edição.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    queryFn: async (): Promise<Plano> => {
      const { data, error } = await db.from("planos").select(COLUNAS).eq("id", id!).single();
      if (error) throw error;
      const p = data as Plano;
      return { ...p, valor: p.valor === null || p.valor === undefined ? null : Number(p.valor) };
    },
  });
}

export function useCreatePlano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlanoInput) => {
      const { error } = await db.from("planos").insert(normaliza(input));
      if (error) throw traduzErro(error);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["planos"] });
      void qc.invalidateQueries({ queryKey: ["plano"] });
      void qc.invalidateQueries({ queryKey: ["plano-gratuito-ativo"] });
    },
  });
}

export function useUpdatePlano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlanoInput & { id: string }) => {
      const { error } = await db
        .from("planos")
        .update(normaliza(input))
        .eq("id", input.id);
      if (error) throw traduzErro(error);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["planos"] });
      void qc.invalidateQueries({ queryKey: ["plano"] });
      void qc.invalidateQueries({ queryKey: ["plano-gratuito-ativo"] });
    },
  });
}

export function useTogglePlanoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await db.from("planos").update({ ativo }).eq("id", id);
      if (error) throw traduzErro(error);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["planos"] });
      void qc.invalidateQueries({ queryKey: ["plano"] });
      void qc.invalidateQueries({ queryKey: ["plano-gratuito-ativo"] });
    },
  });
}

export function useDeletePlano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("planos").delete().eq("id", id);
      if (error) throw traduzErro(error);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["planos"] });
      void qc.invalidateQueries({ queryKey: ["plano"] });
      void qc.invalidateQueries({ queryKey: ["plano-gratuito-ativo"] });
    },
  });
}

/** Grava a nova ordem dos planos (drag and drop). */
export function useReordenarPlanos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map(async (id, index) => {
          const { error } = await db
            .from("planos")
            .update({ ordem: index + 1 })
            .eq("id", id);
          if (error) throw traduzErro(error);
        }),
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["planos"] });
      void qc.invalidateQueries({ queryKey: ["plano"] });
      void qc.invalidateQueries({ queryKey: ["plano-gratuito-ativo"] });
    },
  });
}

