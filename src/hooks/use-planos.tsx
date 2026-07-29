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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planos"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planos"] }),
  });
}

export function useTogglePlanoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await db.from("planos").update({ ativo }).eq("id", id);
      if (error) throw traduzErro(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planos"] }),
  });
}

export function useDeletePlano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("planos").delete().eq("id", id);
      if (error) throw traduzErro(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planos"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planos"] }),
  });
}

