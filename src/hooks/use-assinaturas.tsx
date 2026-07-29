import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";

// Tabela do Supabase autohospedado (fora dos tipos gerados).
const db = supabase as unknown as SupabaseClient;

export interface Assinatura {
  id: string;
  empresa_id: string;
  plano_id: string | null;
  plano_nome: string;
  gratuito: boolean;
  valor: number | null;
  ativo: boolean;
  inicio: string;
  fim: string | null;
  vigencia_dias: number;
  observacao: string | null;
  created_at: string;
}

const COLUNAS =
  "id, empresa_id, plano_id, plano_nome, gratuito, valor, ativo, inicio, fim, vigencia_dias, observacao, created_at";

function normaliza(row: Record<string, unknown>): Assinatura {
  const valor = row.valor;
  return {
    ...(row as unknown as Assinatura),
    valor: valor === null || valor === undefined ? null : Number(valor),
    vigencia_dias: Number(row.vigencia_dias ?? 30) || 30,
  };
}

/** Mensagens amigáveis para as restrições do banco. */
function traduzErro(err: unknown) {
  const msg = (err as { message?: string })?.message ?? "";
  if (msg.includes("empresa_assinaturas_unica_ativa")) {
    return new Error("Esta empresa já possui uma assinatura ativa. Encerre-a antes de continuar.");
  }
  return err instanceof Error ? err : new Error(String(err));
}

/** Histórico completo de assinaturas da empresa (mais recentes primeiro). */
export function useAssinaturas(empresaId: string | undefined) {
  return useQuery({
    queryKey: ["empresa-assinaturas", empresaId ?? null],
    enabled: Boolean(empresaId),
    staleTime: 0,
    queryFn: async (): Promise<Assinatura[]> => {
      const { data, error } = await db
        .from("empresa_assinaturas")
        .select(COLUNAS)
        .eq("empresa_id", empresaId!)
        .order("ativo", { ascending: false })
        .order("inicio", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw traduzErro(error);
      return (data ?? []).map((r) => normaliza(r as Record<string, unknown>));
    },
  });
}

/** Contrata um plano encerrando automaticamente a assinatura ativa anterior. */
export function useDefinirAssinatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      empresaId: string;
      planoId: string;
      inicio?: string | null;
      observacao?: string | null;
    }) => {
      const { data, error } = await db.rpc("sa_definir_assinatura", {
        p_empresa_id: input.empresaId,
        p_plano_id: input.planoId,
        p_inicio: input.inicio || null,
        p_observacao: input.observacao || null,
      });
      if (error) throw traduzErro(error);
      return data as string;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["empresa-assinaturas", vars.empresaId] });
      void qc.invalidateQueries({ queryKey: ["empresa-assinaturas-ativas"] });
      void qc.invalidateQueries({ queryKey: ["planos-uso"] });
    },
  });
}

/** Encerra a assinatura ativa, deixando a empresa sem plano vigente. */
export function useEncerrarAssinatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; empresaId: string; observacao?: string | null }) => {
      const { error } = await db.rpc("sa_encerrar_assinatura", {
        p_id: input.id,
        p_observacao: input.observacao || null,
      });
      if (error) throw traduzErro(error);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["empresa-assinaturas", vars.empresaId] });
      void qc.invalidateQueries({ queryKey: ["empresa-assinaturas-ativas"] });
      void qc.invalidateQueries({ queryKey: ["planos-uso"] });
    },
  });
}

/**
 * Assinaturas vigentes de todas as empresas (uso na listagem do SA).
 * Vigente = ativo e sem data de fim ou com fim ainda no futuro.
 */
export function useAssinaturasAtivas() {
  return useQuery({
    queryKey: ["empresa-assinaturas-ativas"],
    queryFn: async (): Promise<Map<string, Assinatura>> => {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data, error } = await db
        .from("empresa_assinaturas")
        .select(COLUNAS)
        .eq("ativo", true)
        .or(`fim.is.null,fim.gte.${hoje}`);
      if (error) throw traduzErro(error);
      const mapa = new Map<string, Assinatura>();
      for (const row of data ?? []) {
        const a = normaliza(row as Record<string, unknown>);
        mapa.set(a.empresa_id, a);
      }
      return mapa;
    },
  });
}

export interface AssinaturaComEmpresa extends Assinatura {
  empresa_nome: string;
  empresa_cidade: string | null;
  empresa_uf: string | null;
  /** Dias restantes até o fim da vigência (null quando não há data fim). */
  dias_restantes: number | null;
  /** Vigente = ativa e ainda dentro do prazo. */
  vigente: boolean;
}

/** Todas as assinaturas do SaaS, com dados da empresa e dias restantes. */
export function useTodasAssinaturas() {
  return useQuery({
    queryKey: ["assinaturas-todas"],
    staleTime: 0,
    queryFn: async (): Promise<AssinaturaComEmpresa[]> => {
      const [assinaturas, empresas] = await Promise.all([
        db
          .from("empresa_assinaturas")
          .select(COLUNAS)
          .order("ativo", { ascending: false })
          .order("inicio", { ascending: false }),
        db.from("empresas").select("id, nome_fantasia, razao_social, cidade, uf"),
      ]);
      if (assinaturas.error) throw traduzErro(assinaturas.error);
      if (empresas.error) throw traduzErro(empresas.error);

      const mapaEmpresas = new Map<string, Record<string, string | null>>();
      for (const e of empresas.data ?? []) {
        mapaEmpresas.set((e as { id: string }).id, e as Record<string, string | null>);
      }

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      return (assinaturas.data ?? []).map((row) => {
        const a = normaliza(row as Record<string, unknown>);
        const emp = mapaEmpresas.get(a.empresa_id);
        let dias: number | null = null;
        if (a.fim) {
          const fim = new Date(`${a.fim}T00:00:00`);
          dias = Math.ceil((fim.getTime() - hoje.getTime()) / 86_400_000);
        }
        return {
          ...a,
          empresa_nome:
            (emp?.nome_fantasia as string) || (emp?.razao_social as string) || "Empresa removida",
          empresa_cidade: (emp?.cidade as string) ?? null,
          empresa_uf: (emp?.uf as string) ?? null,
          dias_restantes: dias,
          vigente: a.ativo && (dias === null || dias >= 0),
        };
      });
    },
  });
}
