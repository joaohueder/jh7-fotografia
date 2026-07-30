import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";

const db = supabase as unknown as SupabaseClient;

/** Resumo de tudo que será apagado junto com o cadastro do cliente/lead. */
export interface ImpactoExclusaoCliente {
  contatos: number;
  notas: number;
  orcamentos: number;
  itens: number;
  ajustes: number;
  /** Situações dos orçamentos, ex.: { RASCUNHO: 2, APROVADO: 1 }. */
  orcamentosPorStatus: Record<string, number>;
  /** Verdadeiro quando há algum orçamento que não é rascunho. */
  temOrcamentoEmAndamento: boolean;
}

/**
 * Levanta, antes da exclusão, tudo que depende do cadastro:
 * contatos adicionais, anotações, orçamentos e sua composição.
 */
export function useImpactoExclusaoCliente(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: ["impacto-exclusao-cliente", clienteId],
    enabled: Boolean(clienteId),
    staleTime: 0,
    queryFn: async (): Promise<ImpactoExclusaoCliente> => {
      const [contatosRes, notasRes, orcamentosRes] = await Promise.all([
        db.from("cliente_contatos").select("id").eq("cliente_id", clienteId!),
        db.from("cliente_notas").select("id").eq("cliente_id", clienteId!),
        db
          .from("orcamentos")
          .select("id, status, orcamento_itens(id), orcamento_ajustes(id)")
          .eq("cliente_id", clienteId!),
      ]);

      if (contatosRes.error) throw contatosRes.error;
      if (notasRes.error) throw notasRes.error;
      if (orcamentosRes.error) throw orcamentosRes.error;

      const orcamentos = (orcamentosRes.data ?? []) as any[];
      const orcamentosPorStatus: Record<string, number> = {};
      let itens = 0;
      let ajustes = 0;

      for (const o of orcamentos) {
        const status = String(o.status ?? "RASCUNHO");
        orcamentosPorStatus[status] = (orcamentosPorStatus[status] ?? 0) + 1;
        itens += Array.isArray(o.orcamento_itens) ? o.orcamento_itens.length : 0;
        ajustes += Array.isArray(o.orcamento_ajustes) ? o.orcamento_ajustes.length : 0;
      }

      return {
        contatos: (contatosRes.data ?? []).length,
        notas: (notasRes.data ?? []).length,
        orcamentos: orcamentos.length,
        itens,
        ajustes,
        orcamentosPorStatus,
        temOrcamentoEmAndamento: Object.keys(orcamentosPorStatus).some((s) => s !== "RASCUNHO"),
      };
    },
  });
}
