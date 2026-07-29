import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";
import { useEmpresaAtual } from "@/hooks/use-clientes";

const db = supabase as unknown as SupabaseClient;

export interface LimitesEmpresa {
  /** Nome do plano da assinatura ativa (null quando não há assinatura). */
  plano_nome: string | null;
  gratuito: boolean;
  /** null = ilimitado */
  limite_leads: number | null;
  limite_clientes: number | null;
  usado_leads: number;
  usado_clientes: number;
  inicio: string | null;
  fim: string | null;
  vigencia_dias: number;
}

/**
 * Limites contratados pela empresa (plano da assinatura ativa) e o quanto já
 * foi utilizado de leads e clientes.
 */
export function useLimitesEmpresa() {
  const { data: empresaId } = useEmpresaAtual();

  return useQuery({
    queryKey: ["limites-empresa", empresaId ?? null],
    enabled: Boolean(empresaId),
    staleTime: 30 * 1000,
    queryFn: async (): Promise<LimitesEmpresa> => {
      const assinaturaRes = await db
        .from("empresa_assinaturas")
        .select("plano_id, plano_nome, gratuito, inicio, fim, vigencia_dias")
        .eq("empresa_id", empresaId!)
        .eq("ativo", true)
        .limit(1)
        .maybeSingle();

      const assinatura = (assinaturaRes.data ?? null) as {
        plano_id: string | null;
        plano_nome: string | null;
        gratuito: boolean | null;
        inicio: string | null;
        fim: string | null;
        vigencia_dias: number | null;
      } | null;

      let limiteLeads: number | null = null;
      let limiteClientes: number | null = null;

      if (assinatura?.plano_id) {
        const planoRes = await db
          .from("planos")
          .select("limite_leads, limite_clientes")
          .eq("id", assinatura.plano_id)
          .maybeSingle();
        const plano = (planoRes.data ?? null) as {
          limite_leads: number | null;
          limite_clientes: number | null;
        } | null;
        limiteLeads = plano?.limite_leads ?? null;
        limiteClientes = plano?.limite_clientes ?? null;
      }

      const [leadsRes, clientesRes] = await Promise.all([
        db
          .from("clientes")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId!)
          .eq("origem", "LEAD")
          .is("documento", null),
        db
          .from("clientes")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresaId!)
          .not("documento", "is", null),
      ]);

      return {
        plano_nome: assinatura?.plano_nome ?? null,
        gratuito: Boolean(assinatura?.gratuito),
        limite_leads: limiteLeads,
        limite_clientes: limiteClientes,
        usado_leads: leadsRes.count ?? 0,
        usado_clientes: clientesRes.count ?? 0,
        inicio: assinatura?.inicio ?? null,
        fim: assinatura?.fim ?? null,
        vigencia_dias: Number(assinatura?.vigencia_dias ?? 30) || 30,
      };
    },
  });
}
