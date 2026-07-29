import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";

const db = supabase as unknown as SupabaseClient;

export type NotaModulo = "CLIENTES" | "LEADS";
export type NotaTipo = "NOTA" | "INTERESSE";

export interface ClienteNota {
  id: string;
  cliente_id: string;
  descricao: string;
  modulo: NotaModulo;
  tipo: NotaTipo;
  criado_por: string | null;
  criado_por_nome: string | null;
  created_at: string;
}

export const MODULO_LABEL: Record<NotaModulo, string> = {
  CLIENTES: "Clientes",
  LEADS: "Leads",
};

/** Notas internas do cliente/lead — mais recentes primeiro. */
export function useClienteNotas(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["cliente-notas", clienteId],
    enabled: Boolean(clienteId),
    staleTime: 0,
    queryFn: async (): Promise<ClienteNota[]> => {
      const { data, error } = await db
        .from("cliente_notas")
        .select("*")
        .eq("cliente_id", clienteId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClienteNota[];
    },
  });
}

/** Primeira nota registrada (interesse inicial do lead). */
export function useNotaInicial(clienteId: string | undefined) {
  return useQuery({
    queryKey: ["cliente-nota-inicial", clienteId],
    enabled: Boolean(clienteId),
    staleTime: 0,
    queryFn: async (): Promise<ClienteNota | null> => {
      const { data, error } = await db
        .from("cliente_notas")
        .select("*")
        .eq("cliente_id", clienteId!)
        .eq("tipo", "INTERESSE")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ClienteNota | null;
    },
  });
}

/**
 * Nome amigável do usuário logado para assinar a nota.
 * O resultado fica em cache na memória: sem isso, cada nota salva fazia duas
 * idas ao servidor (sessão + perfil), deixando o salvamento lento.
 */
let autorCache: { id: string | null; nome: string | null } | null = null;

async function autorAtual(): Promise<{ id: string | null; nome: string | null }> {
  if (autorCache) return autorCache;

  // getSession lê a sessão local (sem rede), diferente de getUser.
  const { data } = await db.auth.getSession();
  const user = data?.session?.user;
  if (!user) return { id: null, nome: null };

  const { data: perfil } = await db
    .from("profiles")
    .select("display_name, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const p = (perfil ?? {}) as { display_name?: string | null; full_name?: string | null };
  autorCache = { id: user.id, nome: p.display_name || p.full_name || user.email || null };
  return autorCache;
}

// Ao trocar de usuário (login/logout), o cache do autor precisa ser descartado.
db.auth.onAuthStateChange(() => {
  autorCache = null;
});


export async function criarNotaCliente(
  clienteId: string,
  descricao: string,
  modulo: NotaModulo,
  tipo: NotaTipo = "NOTA",
): Promise<void> {
  const texto = descricao.trim();
  if (!texto) return;
  const autor = await autorAtual();
  const { error } = await db.from("cliente_notas").insert({
    cliente_id: clienteId,
    descricao: texto,
    modulo,
    tipo,
    criado_por: autor.id,
    criado_por_nome: autor.nome,
  });
  if (error) throw error;
}

export function useAdicionarNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { clienteId: string; descricao: string; modulo: NotaModulo }) =>
      criarNotaCliente(vars.clienteId, vars.descricao, vars.modulo),
    onSuccess: (_r, vars) =>
      qc.invalidateQueries({ queryKey: ["cliente-notas", vars.clienteId] }),
  });
}

export function useExcluirNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; clienteId: string }) => {
      const { error } = await db.from("cliente_notas").delete().eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_r, vars) =>
      qc.invalidateQueries({ queryKey: ["cliente-notas", vars.clienteId] }),
  });
}

/** Cria ou atualiza a nota de interesse inicial do lead/cliente. */
export async function salvarNotaInicial(
  clienteId: string,
  descricao: string,
  modulo: NotaModulo,
  notaId?: string | null,
): Promise<void> {
  const texto = descricao.trim();
  if (!notaId) {
    await criarNotaCliente(clienteId, texto, modulo, "INTERESSE");
    return;
  }
  if (!texto) return;
  const { error } = await db
    .from("cliente_notas")
    .update({ descricao: texto })
    .eq("id", notaId);
  if (error) throw error;
}
