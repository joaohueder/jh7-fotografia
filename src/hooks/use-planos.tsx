import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";

// Tabela do Supabase autohospedado (fora dos tipos gerados).
const db = supabase as unknown as SupabaseClient;

export interface Plano {
  id: string;
  nome: string;
  created_at: string;
}

/** Mensagem amigável para o índice único de nome. */
function traduzErro(err: unknown) {
  const msg = (err as { message?: string })?.message ?? "";
  if (msg.includes("planos_nome_unico") || msg.includes("duplicate key")) {
    return new Error("Já existe um plano com esse nome.");
  }
  return err instanceof Error ? err : new Error(String(err));
}

export function usePlanos() {
  return useQuery({
    queryKey: ["planos"],
    queryFn: async (): Promise<Plano[]> => {
      const { data, error } = await db
        .from("planos")
        .select("id, nome, created_at")
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Plano[];
    },
  });
}

export function useCreatePlano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await db.from("planos").insert({ nome });
      if (error) throw traduzErro(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planos"] }),
  });
}

export function useUpdatePlano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; nome: string }) => {
      const { error } = await db
        .from("planos")
        .update({ nome: input.nome })
        .eq("id", input.id);
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
