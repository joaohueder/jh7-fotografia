import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";
import { useImpersonacao } from "@/hooks/use-impersonacao";

// Tabelas do Supabase autohospedado (fora dos tipos gerados).
const db = supabase as unknown as SupabaseClient;

export type ClienteStatus = "ATIVO" | "INATIVO";

export interface ClienteContato {
  id?: string;
  tipo: string;
  valor: string;
  descricao: string | null;
}

export type ClienteOrigem = "CLIENTE" | "LEAD";

export interface Cliente {
  id: string;
  empresa_id: string;
  nome: string;
  nascimento: string | null;
  status: ClienteStatus;
  origem: ClienteOrigem;
  documento: string | null;
  cep: string | null;
  endereco: string | null;
  complemento: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  contato_whatsapp: string | null;
  contato_email: string | null;
  observacoes: string | null;
  created_at: string;
}

export type ClientePayload = Omit<Cliente, "id" | "empresa_id" | "created_at">;


/** Empresa em contexto: a do usuário logado ou a personificada pelo SA. */
export function useEmpresaAtual() {
  const { empresa } = useImpersonacao();
  const impersonadaId = empresa?.id ?? null;

  return useQuery({
    queryKey: ["empresa-atual", impersonadaId ?? "self"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string> => {
      if (impersonadaId) return impersonadaId;
      const { data, error } = await db.rpc("minha_empresa_id", { p_id: null });
      if (error) throw error;
      if (!data) throw new Error("Usuário não está vinculado a uma empresa");
      return data as string;
    },
  });
}

export function useClientes() {
  const { data: empresaId } = useEmpresaAtual();

  return useQuery({
    queryKey: ["clientes", empresaId],
    enabled: Boolean(empresaId),
    queryFn: async (): Promise<Cliente[]> => {
      const { data, error } = await db
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId!)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Cliente[];
    },
  });
}

export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: ["cliente", id],
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: async () => {
      const [clienteRes, contatosRes] = await Promise.all([
        db.from("clientes").select("*").eq("id", id!).single(),
        db.from("cliente_contatos").select("*").eq("cliente_id", id!).order("created_at"),
      ]);
      if (clienteRes.error) throw clienteRes.error;
      if (contatosRes.error) throw contatosRes.error;
      return {
        cliente: clienteRes.data as Cliente,
        contatos: (contatosRes.data ?? []) as ClienteContato[],
      };
    },
  });
}

interface SalvarInput {
  id?: string;
  empresaId: string;
  cliente: ClientePayload;
  contatos: ClienteContato[];
}

function traduzErro(message: string) {
  if (message.includes("clientes_documento_unico"))
    return "Já existe um cliente cadastrado com este CPF/CNPJ.";
  return message;
}

export function useSalvarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, empresaId, cliente, contatos }: SalvarInput) => {
      let clienteId = id;

      if (clienteId) {
        const { error } = await db.from("clientes").update(cliente).eq("id", clienteId);
        if (error) throw new Error(traduzErro(error.message));
      } else {
        const { data, error } = await db
          .from("clientes")
          .insert({ ...cliente, empresa_id: empresaId })
          .select("id")
          .single();
        if (error) throw new Error(traduzErro(error.message));
        clienteId = (data as { id: string }).id;
      }

      const del = await db.from("cliente_contatos").delete().eq("cliente_id", clienteId);
      if (del.error) throw del.error;

      const validos = contatos.filter((c) => c.valor.trim());
      if (validos.length) {
        const { error } = await db.from("cliente_contatos").insert(
          validos.map((c) => ({
            cliente_id: clienteId,
            tipo: c.tipo,
            valor: c.valor,
            descricao: c.descricao?.trim() ? c.descricao : null,
          })),
        );
        if (error) throw error;
      }

      return clienteId as string;
    },
    onSuccess: (_id, vars) => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      if (vars.id) qc.invalidateQueries({ queryKey: ["cliente", vars.id] });
    },
  });
}

export function useSetClienteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ClienteStatus }) => {
      const { error } = await db.from("clientes").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  });
}

export function useDeleteCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  });
}

/** Verdadeiro quando já existe outro cliente da empresa com o mesmo CPF/CNPJ. */
export async function documentoDuplicado(
  empresaId: string,
  documento: string,
  ignoreId?: string,
): Promise<boolean> {
  const digits = (documento ?? "").replace(/\D/g, "");
  if (!digits) return false;

  const { data, error } = await db
    .from("clientes")
    .select("id, documento")
    .eq("empresa_id", empresaId);
  if (error) throw error;

  return (data ?? []).some((c: { id: string; documento: string | null }) => {
    if (ignoreId && c.id === ignoreId) return false;
    return (c.documento ?? "").replace(/\D/g, "") === digits;
  });
}

/** Verdadeiro quando a data de nascimento indica menos de 18 anos. */

export function isMenorDeIdade(nascimento: string | null | undefined) {
  if (!nascimento) return false;
  const nasc = new Date(`${nascimento}T00:00:00`);
  if (Number.isNaN(nasc.getTime())) return false;
  const limite = new Date();
  limite.setFullYear(limite.getFullYear() - 18);
  return nasc > limite;
}
