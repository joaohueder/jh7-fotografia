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

/** Produto copiado junto com o serviço (apenas cópia, sem vínculo). */
export interface OrcamentoItemProduto {
  nome: string;
  quantidade: number;
}

/**
 * Item do orçamento. É uma CÓPIA do serviço/agrupamento no momento em que
 * foi incluído — nada aqui depende do cadastro de origem.
 */
export interface OrcamentoItem {
  nome: string;
  origem_tipo: "SERVICO" | "GRUPO" | "MANUAL";
  origem_nome: string | null;
  quantidade: number;
  valor_unitario: number | null;
  valor_custo: number | null;
  produtos: OrcamentoItemProduto[];
}

/** Tipo de ajuste no valor final da proposta. */
export type OrcamentoAjusteTipo = "NENHUM" | "DESCONTO" | "ACRESCIMO";

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
  /** Quantidade de serviços incluídos na proposta. */
  total_itens: number;
  /** Soma de quantidade x valor de cada item (null quando nenhum item tem valor). */
  total_valor: number | null;
  /** Desconto (subtrai), acréscimo (soma) ou nenhum ajuste. */
  ajuste_tipo: OrcamentoAjusteTipo;
  /** Valor em reais do desconto/acréscimo. */
  ajuste_valor: number | null;
  /** Motivo do desconto/acréscimo. */
  ajuste_descricao: string | null;
  /** Observação geral da proposta. */
  observacoes: string | null;
  /** Total dos itens já com o desconto/acréscimo aplicado. */
  total_final: number | null;
}

export interface OrcamentoPayload {
  cliente_id: string;
  descricao: string;
  status: OrcamentoStatus;
  data_orcamento: string;
  validade: string | null;
  ajuste_tipo: OrcamentoAjusteTipo;
  ajuste_valor: number | null;
  ajuste_descricao: string | null;
  observacoes: string | null;
  /** Itens copiados, na ordem escolhida pelo usuário. */
  itens: OrcamentoItem[];
}

/** Aplica desconto/acréscimo sobre o total dos itens (nunca fica negativo). */
export function aplicarAjuste(
  totalItens: number | null,
  tipo: OrcamentoAjusteTipo,
  valor: number | null,
): number | null {
  if (totalItens == null) return null;
  if (tipo === "NENHUM" || valor == null) return totalItens;
  const final = tipo === "DESCONTO" ? totalItens - valor : totalItens + valor;
  return final < 0 ? 0 : final;
}


function estaVencido(validade: string | null, status: OrcamentoStatus) {
  if (!validade) return false;
  if (status === "APROVADO" || status === "RECUSADO" || status === "CANCELADO") return false;
  const hoje = new Date();
  const limite = new Date(`${validade}T23:59:59`);
  return limite.getTime() < hoje.getTime();
}

function mapearItem(i: any): OrcamentoItem {
  return {
    nome: i.nome,
    origem_tipo: (i.origem_tipo ?? "SERVICO") as OrcamentoItem["origem_tipo"],
    origem_nome: i.origem_nome ?? null,
    quantidade: Number(i.quantidade ?? 1),
    valor_unitario: i.valor_unitario == null ? null : Number(i.valor_unitario),
    valor_custo: i.valor_custo == null ? null : Number(i.valor_custo),
    produtos: Array.isArray(i.produtos)
      ? (i.produtos as any[]).map((p) => ({
          nome: String(p?.nome ?? "Produto"),
          quantidade: Number(p?.quantidade ?? 1),
        }))
      : [],
  };
}

/** Soma quantidade x valor unitário dos itens. */
export function somarItens(itens: OrcamentoItem[]): number | null {
  const comValor = itens.filter((i) => i.valor_unitario != null);
  if (comValor.length === 0) return null;
  return comValor.reduce((s, i) => s + Number(i.valor_unitario) * Number(i.quantidade || 1), 0);
}

/** Lista os orçamentos da empresa, com atualização em tempo real. */
export function useOrcamentos() {
  const { data: empresaId } = useEmpresaAtual();
  const qc = useQueryClient();

  useEffect(() => {
    const invalidar = () => {
      qc.invalidateQueries({ queryKey: ["orcamentos"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["orcamento"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["orcamento-itens"], refetchType: "active" });
    };
    const channel = supabase
      .channel("orcamentos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orcamentos" }, invalidar)
      .on("postgres_changes", { event: "*", schema: "public", table: "orcamento_itens" }, invalidar)
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
          "id, empresa_id, cliente_id, descricao, status, data_orcamento, validade, ajuste_tipo, ajuste_valor, ajuste_descricao, observacoes, created_at, clientes ( nome, origem ), orcamento_itens ( nome, origem_tipo, origem_nome, quantidade, valor_unitario, valor_custo, produtos )",
        )
        .eq("empresa_id", empresaId!)
        .order("data_orcamento", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;

      return ((data ?? []) as any[]).map((o) => {
        const itens = ((o.orcamento_itens ?? []) as any[]).map(mapearItem);
        const totalItens = somarItens(itens);
        const ajusteTipo = (o.ajuste_tipo ?? "NENHUM") as OrcamentoAjusteTipo;
        const ajusteValor = o.ajuste_valor == null ? null : Number(o.ajuste_valor);
        return {
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
          total_itens: itens.length,
          total_valor: totalItens,
          ajuste_tipo: ajusteTipo,
          ajuste_valor: ajusteValor,
          ajuste_descricao: o.ajuste_descricao ?? null,
          observacoes: o.observacoes ?? null,
          total_final: aplicarAjuste(totalItens, ajusteTipo, ajusteValor),
        } as Orcamento;
      });

    },
  });
}

/** Busca um orçamento específico (tela de edição), já com os itens copiados. */
export function useOrcamento(id?: string) {
  return useQuery({
    queryKey: ["orcamento", id],
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: async (): Promise<OrcamentoPayload | null> => {
      const { data, error } = await db
        .from("orcamentos")
        .select(
          "cliente_id, descricao, status, data_orcamento, validade, ajuste_tipo, ajuste_valor, ajuste_descricao, observacoes",
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const o = data as any;

      const { data: itens, error: erroItens } = await db
        .from("orcamento_itens")
        .select("nome, origem_tipo, origem_nome, quantidade, valor_unitario, valor_custo, produtos")
        .eq("orcamento_id", id!)
        .order("ordem", { ascending: true });
      if (erroItens) throw erroItens;

      return {
        cliente_id: o.cliente_id,
        descricao: o.descricao,
        status: o.status as OrcamentoStatus,
        data_orcamento: o.data_orcamento,
        validade: o.validade ?? null,
        ajuste_tipo: (o.ajuste_tipo ?? "NENHUM") as OrcamentoAjusteTipo,
        ajuste_valor: o.ajuste_valor == null ? null : Number(o.ajuste_valor),
        ajuste_descricao: o.ajuste_descricao ?? null,
        observacoes: o.observacoes ?? null,
        itens: ((itens ?? []) as any[]).map(mapearItem),
      };

    },
  });
}

/** Cria ou atualiza um orçamento e regrava a lista de itens copiados. */
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
        ajuste_tipo: dados.ajuste_tipo,
        ajuste_valor: dados.ajuste_tipo === "NENHUM" ? null : dados.ajuste_valor,
        ajuste_descricao:
          dados.ajuste_tipo === "NENHUM" ? null : dados.ajuste_descricao?.trim() || null,
        observacoes: dados.observacoes?.trim() || null,

      };

      let orcamentoId = id;
      let empresaDoOrcamento = empresaId;

      if (id) {
        const { data, error } = await db
          .from("orcamentos")
          .update(valores)
          .eq("id", id)
          .select("empresa_id")
          .single();
        if (error) throw error;
        empresaDoOrcamento = (data as { empresa_id: string }).empresa_id;
      } else {
        if (!empresaId) throw new Error("Empresa não identificada para o cadastro.");
        const { data, error } = await db
          .from("orcamentos")
          .insert({ ...valores, empresa_id: empresaId })
          .select("id, empresa_id")
          .single();
        if (error) throw error;
        orcamentoId = (data as { id: string }).id;
        empresaDoOrcamento = (data as { empresa_id: string }).empresa_id;
      }

      // Os itens são cópias: regravamos sempre a lista inteira, na ordem.
      const { error: erroLimpar } = await db
        .from("orcamento_itens")
        .delete()
        .eq("orcamento_id", orcamentoId!);
      if (erroLimpar) throw erroLimpar;

      if (dados.itens.length > 0) {
        const linhas = dados.itens.map((item, indice) => ({
          empresa_id: empresaDoOrcamento,
          orcamento_id: orcamentoId,
          ordem: indice,
          origem_tipo: item.origem_tipo,
          origem_nome: item.origem_nome,
          nome: item.nome.trim().slice(0, 200),
          quantidade: item.quantidade > 0 ? item.quantidade : 1,
          valor_unitario: item.valor_unitario,
          valor_custo: item.valor_custo,
          produtos: item.produtos,
        }));
        const { error: erroItens } = await db.from("orcamento_itens").insert(linhas);
        if (erroItens) throw erroItens;
      }

      return orcamentoId!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orcamentos"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["orcamento"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["orcamento-itens"], refetchType: "active" });
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
