import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";
import { useEmpresaAtual } from "@/hooks/use-clientes";

// Tabelas do Supabase autohospedado (fora dos tipos gerados).
const db = supabase as unknown as SupabaseClient;

export type OrcamentoStatus =
  | "RASCUNHO"
  | "ENVIADO"
  | "APROVADO"
  | "RECUSADO"
  | "CANCELADO";

export const ORCAMENTO_STATUS: { valor: OrcamentoStatus; rotulo: string; ajuda: string }[] = [
  {
    valor: "RASCUNHO",
    rotulo: "Rascunho",
    ajuda: "Ainda está sendo montado e não foi mostrado para o cliente.",
  },
  {
    valor: "ENVIADO",
    rotulo: "Enviado",
    ajuda: "Já foi apresentado ao cliente e você aguarda a resposta.",
  },
  { valor: "APROVADO", rotulo: "Aprovado", ajuda: "O cliente aceitou a proposta." },
  { valor: "RECUSADO", rotulo: "Recusado", ajuda: "O cliente não aceitou a proposta." },
  {
    valor: "CANCELADO",
    rotulo: "Cancelado",
    ajuda: "O orçamento foi cancelado por você ou pelo cliente.",
  },
];

export function rotuloStatus(status: OrcamentoStatus) {
  return ORCAMENTO_STATUS.find((s) => s.valor === status)?.rotulo ?? status;
}

export interface Orcamento {
  id: string;
  empresa_id: string;
  cliente_id: string;
  descricao: string;
  status: OrcamentoStatus;
  data_orcamento: string;
  validade: string | null;
  created_at: string;
  /** Nome do cliente ou lead vinculado. */
  cliente_nome: string;
  /** CLIENTE ou LEAD, para mostrar de onde veio o contato. */
  cliente_origem: "CLIENTE" | "LEAD";
  /** Verdadeiro quando a validade já passou. */
  vencido: boolean;
}

export interface OrcamentoPayload {
  cliente_id: string;
  descricao: string;
  status: OrcamentoStatus;
  data_orcamento: string;
  validade: string | null;
}

function estaVencido(validade: string | null, status: OrcamentoStatus) {
  if (!validade) return false;
  if (status === "APROVADO" || status === "RECUSADO" || status === "CANCELADO") return false;
  const hoje = new Date();
  const limite = new Date(`${validade}T23:59:59`);
  return limite.getTime() < hoje.getTime();
}

/** Lista os orçamentos da empresa, com atualização em tempo real. */
export function useOrcamentos() {
  const { data: empresaId } = useEmpresaAtual();
  const qc = useQueryClient();

  useEffect(() => {
    const invalidar = () => {
      qc.invalidateQueries({ queryKey: ["orcamentos"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["orcamento"], refetchType: "active" });
    };
    const channel = supabase
      .channel("orcamentos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orcamentos" }, invalidar)
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, invalidar)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["orcamentos", empresaId],
    enabled: Boolean(empresaId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Orcamento[]> => {
      const { data, error } = await db
        .from("orcamentos")
        .select(
          "id, empresa_id, cliente_id, descricao, status, data_orcamento, validade, created_at, clientes ( nome, origem )",
        )
        .eq("empresa_id", empresaId!)
        .order("data_orcamento", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;

      return ((data ?? []) as any[]).map((o) => ({
        id: o.id,
        empresa_id: o.empresa_id,
        cliente_id: o.cliente_id,
        descricao: o.descricao,
        status: o.status as OrcamentoStatus,
        data_orcamento: o.data_orcamento,
        validade: o.validade ?? null,
        created_at: o.created_at,
        cliente_nome: o.clientes?.nome ?? "Contato removido",
        cliente_origem: (o.clientes?.origem ?? "CLIENTE") as "CLIENTE" | "LEAD",
        vencido: estaVencido(o.validade ?? null, o.status as OrcamentoStatus),
      }));
    },
  });
}

/** Busca um orçamento específico (tela de edição). */
export function useOrcamento(id?: string) {
  return useQuery({
    queryKey: ["orcamento", id],
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: async (): Promise<OrcamentoPayload | null> => {
      const { data, error } = await db
        .from("orcamentos")
        .select("cliente_id, descricao, status, data_orcamento, validade")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const o = data as any;
      return {
        cliente_id: o.cliente_id,
        descricao: o.descricao,
        status: o.status as OrcamentoStatus,
        data_orcamento: o.data_orcamento,
        validade: o.validade ?? null,
      };
    },
  });
}

/** Cria ou atualiza um orçamento. */
export function useSalvarOrcamento() {
  const qc = useQueryClient();
  const { data: empresaId } = useEmpresaAtual();

  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: OrcamentoPayload }) => {
      const valores = {
        cliente_id: dados.cliente_id,
        descricao: dados.descricao.trim(),
        status: dados.status,
        data_orcamento: dados.data_orcamento,
        validade: dados.validade || null,
      };

      if (id) {
        const { error } = await db.from("orcamentos").update(valores).eq("id", id);
        if (error) throw error;
        return id;
      }

      if (!empresaId) throw new Error("Empresa não identificada para o cadastro.");
      const { data, error } = await db
        .from("orcamentos")
        .insert({ ...valores, empresa_id: empresaId })
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orcamentos"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["orcamento"], refetchType: "active" });
    },
  });
}

/** Muda somente o status do orçamento (atalho da listagem). */
export function useSetOrcamentoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrcamentoStatus }) => {
      const { error } = await db.from("orcamentos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orcamentos"], refetchType: "active" });
    },
  });
}

export function useDeleteOrcamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("orcamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orcamentos"], refetchType: "active" });
    },
  });
}
