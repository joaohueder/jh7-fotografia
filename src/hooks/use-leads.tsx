import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";
import { useEmpresaAtual } from "@/hooks/use-clientes";
import { type NotaModulo } from "@/hooks/use-cliente-notas";

const db = supabase as unknown as SupabaseClient;

export interface Lead {
  id: string;
  empresa_id: string;
  nome: string;
  contato_whatsapp: string | null;
  status: "ATIVO" | "INATIVO";
  origem: string;
  created_at: string;
  ultima_nota?: {
    descricao: string;
    modulo: NotaModulo;
    criado_por_nome: string | null;
    created_at: string;
  } | null;
}

/** Leads são clientes com origem = LEAD (nome + WhatsApp). */
export function useLeads() {
  const { data: empresaId } = useEmpresaAtual();

  return useQuery({
    queryKey: ["leads", empresaId],
    enabled: Boolean(empresaId),
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await db
        .from("clientes")
        .select(
          "id, empresa_id, nome, contato_whatsapp, status, origem, created_at, cliente_notas(descricao, modulo, criado_por_nome, created_at)",
        )
        .eq("empresa_id", empresaId!)
        .eq("origem", "LEAD")
        // Somente leads ainda não convertidos (sem cadastro completo)
        .is("documento", null)
        .order("created_at", { ascending: false, foreignTable: "cliente_notas" })
        .limit(1, { foreignTable: "cliente_notas" })
        .order("created_at", { ascending: false });
      if (error) throw error;

      return ((data ?? []) as any[]).map((l) => {
        const notas = Array.isArray(l.cliente_notas) ? (l.cliente_notas as Lead["ultima_nota"][]) : [];
        const { cliente_notas: _, ...rest } = l;
        return {
          ...rest,
          ultima_nota: notas[0] ?? null,
        } as Lead;
      });
    },
  });
}


interface SalvarLeadInput {
  id?: string;
  empresaId: string;
  nome: string;
  whatsapp: string;
}

export function useSalvarLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, empresaId, nome, whatsapp }: SalvarLeadInput) => {
      const valores = {
        nome: nome.trim(),
        contato_whatsapp: whatsapp.trim() || null,
      };

      if (id) {
        const { error } = await db.from("clientes").update(valores).eq("id", id);
        if (error) throw error;
        return id;
      }

      const { data, error } = await db
        .from("clientes")
        .insert({ ...valores, empresa_id: empresaId, origem: "LEAD", status: "ATIVO" })
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

/** Converte um lead em cliente (muda a origem para CLIENTE). */
export function useConverterLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("clientes").update({ origem: "CLIENTE" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}
