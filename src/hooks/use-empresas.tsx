import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";

// Tabelas do Supabase autohospedado (fora dos tipos gerados).
const db = supabase as unknown as SupabaseClient;

export type EmpresaStatus = "ATIVO" | "INATIVO";

export interface EmpresaContato {
  id?: string;
  tipo: string;
  valor: string;
  descricao: string | null;
}

export interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  status: EmpresaStatus;
  cep: string | null;
  endereco: string | null;
  complemento: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  resp_nome: string;
  resp_nascimento: string | null;
  resp_cpf: string | null;
  resp_cep: string | null;
  resp_endereco: string | null;
  resp_complemento: string | null;
  resp_numero: string | null;
  resp_bairro: string | null;
  resp_cidade: string | null;
  resp_uf: string | null;
  resp_whatsapp: string | null;
  resp_email: string | null;
  contato_whatsapp: string | null;
  contato_email: string | null;
  observacoes: string | null;
  admin_user_id: string | null;
  created_at: string;
}

export type EmpresaPayload = Omit<Empresa, "id" | "admin_user_id" | "created_at">;

export function useEmpresas() {
  return useQuery({
    queryKey: ["empresas"],
    queryFn: async (): Promise<Empresa[]> => {
      const { data, error } = await db
        .from("empresas")
        .select("*")
        .order("razao_social", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Empresa[];
    },
  });
}

export function useEmpresa(id: string | undefined) {
  return useQuery({
    queryKey: ["empresa", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const [empresaRes, contatosRes, emailRes] = await Promise.all([
        db.from("empresas").select("*").eq("id", id!).single(),
        db.from("empresa_contatos").select("*").eq("empresa_id", id!).order("created_at"),
        db.rpc("sa_empresa_admin_email", { p_id: id! }),
      ]);
      if (empresaRes.error) throw empresaRes.error;
      if (contatosRes.error) throw contatosRes.error;
      return {
        empresa: empresaRes.data as Empresa,
        contatos: (contatosRes.data ?? []) as EmpresaContato[],
        adminEmail: (emailRes.data as string | null) ?? null,
      };
    },
  });
}


export function useCreateEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      empresa: EmpresaPayload;
      contatos: EmpresaContato[];
      email: string;
      password: string;
    }) => {
      const { data, error } = await db.rpc("sa_create_empresa", {
        p_empresa: input.empresa,
        p_contatos: input.contatos,
        p_email: input.email,
        p_password: input.password,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["empresas"] }),
  });
}

export function useUpdateEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      empresa: EmpresaPayload;
      contatos: EmpresaContato[];
      password?: string;
    }) => {
      const { error } = await db.rpc("sa_update_empresa", {
        p_id: input.id,
        p_empresa: input.empresa,
        p_contatos: input.contatos,
        p_password: input.password || null,
      });
      if (error) throw error;
      return input.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["empresas"] });
      qc.invalidateQueries({ queryKey: ["empresa", id] });
    },
  });
}

/** Verifica se já existe usuário de autenticação com este e-mail. */
export async function checkEmailExists(email: string) {
  const { data, error } = await db.rpc("sa_email_exists", { p_email: email });
  if (error) throw error;
  return Boolean(data);
}

/** Checa dependências antes de excluir (usuários vinculados à empresa). */
export async function fetchEmpresaDependencias(id: string) {
  const { data, error } = await db.rpc("sa_empresa_dependencias", { p_id: id });
  if (error) throw error;
  return (data ?? { usuarios: 0 }) as { usuarios: number };
}


export function useDeleteEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc("sa_delete_empresa", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["empresas"] }),
  });
}

/** Consulta de CEP (ViaCEP) para preencher endereço automaticamente. */
export async function lookupCep(cep: string) {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const json = (await res.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (json.erro) return null;
    return {
      endereco: json.logradouro ?? "",
      bairro: json.bairro ?? "",
      cidade: json.localidade ?? "",
      uf: json.uf ?? "",
    };
  } catch {
    return null;
  }
}
