import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";
import { useAuth } from "@/hooks/use-auth";

const db = supabase as unknown as SupabaseClient;

export interface Acesso {
  ativo: boolean;
  motivo: string | null;
  role: "sa_admin" | "admin" | "usuario" | null;
  empresa_id: string | null;
  assinatura_ativa: boolean;
}

const PADRAO: Acesso = {
  ativo: true,
  motivo: null,
  role: null,
  empresa_id: null,
  assinatura_ativa: true,
};

export function normalizaAcesso(data: unknown): Acesso {
  const raw = (data ?? {}) as Partial<Acesso>;
  return {
    ativo: raw.ativo ?? true,
    motivo: raw.motivo ?? null,
    role: (raw.role as Acesso["role"]) ?? null,
    empresa_id: raw.empresa_id ?? null,
    // Bancos ainda sem o script 18 não retornam o campo: não bloqueia ninguém.
    assinatura_ativa: raw.assinatura_ativa ?? true,
  };
}

export async function buscarAcesso(): Promise<Acesso> {
  const { data, error } = await db.rpc("meu_acesso");
  if (error) return PADRAO;
  return normalizaAcesso(data);
}

/** Situação de acesso do usuário logado (papel, empresa e assinatura). */
export function useAcesso() {
  const { user, isLoading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["meu-acesso", user?.id ?? null],
    enabled: Boolean(user) && !authLoading,
    staleTime: 60 * 1000,
    queryFn: buscarAcesso,
  });
}
