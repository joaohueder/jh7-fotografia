import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";
import { useEmpresaAtual } from "@/hooks/use-clientes";
import { type NotaModulo } from "@/hooks/use-cliente-notas";

const db = supabase as unknown as SupabaseClient;

/** Situação do lead dentro do funil de atendimento. */
export type LeadSituacao = "AGUARDANDO" | "DESISTIU" | "CLIENTE";

export const LEAD_SITUACOES: { valor: LeadSituacao; rotulo: string; ajuda: string }[] = [
  {
    valor: "AGUARDANDO",
    rotulo: "Aguardando",
    ajuda: "Contatos ainda em negociação, que não fecharam nem desistiram.",
  },
  {
    valor: "DESISTIU",
    rotulo: "Desistiu",
    ajuda: "Contatos que avisaram que não têm mais interesse no momento.",
  },
  {
    valor: "CLIENTE",
    rotulo: "Virou cliente",
    ajuda: "Leads que já preencheram o cadastro completo e viraram clientes.",
  },
];

export interface Lead {
  id: string;
  empresa_id: string;
  nome: string;
  contato_whatsapp: string | null;
  status: "ATIVO" | "INATIVO";
  origem: string;
  created_at: string;
  /** Situação do lead no funil: aguardando, desistiu ou já virou cliente. */
  situacao: LeadSituacao;
  ultima_nota?: {
    descricao: string;
    modulo: NotaModulo;
    criado_por_nome: string | null;
    created_at: string;
  } | null;
  /** Motivo pelo qual o lead entrou em contato (primeira anotação). */
  interesse?: {
    descricao: string;
    criado_por_nome: string | null;
    created_at: string;
  } | null;
}

/** Leads são clientes com origem = LEAD (nome + WhatsApp). */
export function useLeads() {
  const { data: empresaId } = useEmpresaAtual();
  const qc = useQueryClient();

  // Tempo real: recarrega a lista assim que leads ou notas mudarem no banco,
  // mesmo que a alteração tenha vindo de outro usuário/aba.
  useEffect(() => {
    const invalidar = () => {
      qc.invalidateQueries({ queryKey: ["leads"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["limites-empresa"] });
      // O gráfico de evolução também precisa acompanhar as mudanças em tempo real.
      qc.invalidateQueries({ queryKey: ["leads-evolucao"], refetchType: "active" });
    };
    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, invalidar)
      .on("postgres_changes", { event: "*", schema: "public", table: "cliente_notas" }, invalidar)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["leads", empresaId],
    enabled: Boolean(empresaId),
    staleTime: 0,
    refetchInterval: 20 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await db
        .from("clientes")
        .select(
          "id, empresa_id, nome, contato_whatsapp, status, origem, created_at, documento, lead_status, cliente_notas(descricao, modulo, criado_por_nome, created_at, tipo), interesse:cliente_notas(descricao, criado_por_nome, created_at, tipo)",
        )
        .eq("empresa_id", empresaId!)
        .eq("origem", "LEAD")
        .eq("interesse.tipo", "INTERESSE")
        .order("created_at", { ascending: false, foreignTable: "cliente_notas" })
        .limit(10, { foreignTable: "cliente_notas" })
        .limit(1, { foreignTable: "interesse" })
        .order("created_at", { ascending: false });
      if (error) throw error;

      return ((data ?? []) as any[]).map((l) => {
        const notas = Array.isArray(l.cliente_notas) ? (l.cliente_notas as any[]) : [];
        const interesses = Array.isArray(l.interesse) ? (l.interesse as Lead["interesse"][]) : [];
        const interesse = interesses[0] ?? null;
        // A última nota é a movimentação mais recente que não seja o interesse inicial.
        const ultima =
          notas.find(
            (n) =>
              n?.tipo !== "INTERESSE" &&
              !(interesse && n?.created_at === interesse.created_at && n?.descricao === interesse.descricao),
          ) ?? null;
        const { cliente_notas: _n, interesse: _i, documento, lead_status, ...rest } = l;
        // Regra única de conversão (src/lib/clientes.ts): quem já preencheu o
        // cadastro completo (documento) virou cliente.
        const situacao: LeadSituacao = ehClienteConvertido({ origem: l.origem, documento })
          ? "CLIENTE"
          : lead_status === "DESISTIU"
            ? "DESISTIU"
            : "AGUARDANDO";

        return {
          ...rest,
          situacao,
          ultima_nota: ultima,
          interesse,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["limites-empresa"] });
      qc.invalidateQueries({ queryKey: ["leads-evolucao"], refetchType: "active" });
    },
  });
}

/**
 * Marca o lead como "aguardando" ou "desistiu".
 * Ao desistir, as propostas abertas (rascunho/enviado) viram "recusado";
 * ao voltar para aguardando, as propostas recusadas voltam para "rascunho".
 */
export function useSituacaoLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, situacao }: { id: string; situacao: "AGUARDANDO" | "DESISTIU" }) => {
      const { error } = await db.from("clientes").update({ lead_status: situacao }).eq("id", id);
      if (error) throw error;

      const { error: erroOrc } =
        situacao === "DESISTIU"
          ? await db
              .from("orcamentos")
              .update({ status: "RECUSADO" })
              .eq("cliente_id", id)
              .in("status", ["RASCUNHO", "ENVIADO"])
          : await db
              .from("orcamentos")
              .update({ status: "RASCUNHO" })
              .eq("cliente_id", id)
              .eq("status", "RECUSADO");
      if (erroOrc) throw erroOrc;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["limites-empresa"] });
      qc.invalidateQueries({ queryKey: ["leads-evolucao"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["orcamentos"], refetchType: "active" });
    },
  });
}


export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["leads-evolucao"] });
    },
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
      qc.invalidateQueries({ queryKey: ["leads-evolucao"] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}

export interface LeadMes {
  /** Rótulo curto do mês, ex.: "jan/25". */
  mes: string;
  /** Quantidade de leads captados naquele mês. */
  total: number;
  /** Quantidade de leads daquele mês que já viraram cliente. */
  clientes: number;
}

/**
 * Evolução mensal dos leads nos últimos 6 meses.
 * Considera todo contato que nasceu como lead — inclusive os que já viraram
 * clientes — para que o histórico não diminua após uma conversão.
 */
export function useLeadsEvolucao() {
  const { data: empresaId } = useEmpresaAtual();

  return useQuery({
    queryKey: ["leads-evolucao", empresaId],
    enabled: Boolean(empresaId),
    // Igual à lista: sempre buscar dados frescos para o gráfico acompanhar em tempo real.
    staleTime: 0,
    refetchInterval: 20 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<LeadMes[]> => {
      const inicio = new Date();
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);
      inicio.setMonth(inicio.getMonth() - 5);

      const { data, error } = await db
        .from("clientes")
        .select("id, created_at, origem, documento, cliente_notas(tipo)")
        .eq("empresa_id", empresaId!)
        .gte("created_at", inicio.toISOString());
      if (error) throw error;

      const registros = ((data ?? []) as any[]).filter((c) => {
        if (c.origem === "LEAD") return true;
        // Cliente convertido a partir de um lead: possui a nota de interesse inicial.
        const notas = Array.isArray(c.cliente_notas) ? c.cliente_notas : [];
        return notas.some((n: any) => n?.tipo === "INTERESSE");
      });

      const meses: LeadMes[] = [];
      const chaves: string[] = [];
      for (let i = 0; i < 6; i += 1) {
        const d = new Date(inicio);
        d.setMonth(inicio.getMonth() + i);
        chaves.push(`${d.getFullYear()}-${d.getMonth()}`);
        meses.push({
          mes: d
            .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
            .replace(".", ""),
          total: 0,
          clientes: 0,
        });
      }

      for (const r of registros) {
        const d = new Date(r.created_at);
        const idx = chaves.indexOf(`${d.getFullYear()}-${d.getMonth()}`);
        if (idx >= 0) {
          meses[idx].total += 1;
          if (r.documento) meses[idx].clientes += 1;
        }
      }

      return meses;
    },
  });
}

