import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";
import { useEmpresaAtual } from "@/hooks/use-clientes";

// Tabelas do Supabase autohospedado (fora dos tipos gerados).
const db = supabase as unknown as SupabaseClient;

export type ContratoStatus =
  | "RASCUNHO"
  | "ASSINADO"
  | "VIGENTE"
  | "CONCLUIDO"
  | "CANCELADO";

export const CONTRATO_STATUS: { valor: ContratoStatus; rotulo: string; ajuda: string }[] = [
  {
    valor: "RASCUNHO",
    rotulo: "Rascunho",
    ajuda: "Ainda está sendo montado e não foi assinado pelo cliente.",
  },
  {
    valor: "ASSINADO",
    rotulo: "Assinado",
    ajuda: "O cliente já assinou, mas o período de execução ainda não começou.",
  },
  {
    valor: "VIGENTE",
    rotulo: "Vigente",
    ajuda: "Contrato em andamento: os serviços estão sendo executados.",
  },
  {
    valor: "CONCLUIDO",
    rotulo: "Concluído",
    ajuda: "Todos os serviços do contrato já foram entregues.",
  },
  {
    valor: "CANCELADO",
    rotulo: "Cancelado",
    ajuda: "O contrato foi encerrado antes da conclusão.",
  },
];

export function rotuloContratoStatus(status: ContratoStatus) {
  return CONTRATO_STATUS.find((s) => s.valor === status)?.rotulo ?? status;
}

/** Situações que já geram compromisso e não podem ser apagadas. */
export function contratoTemDadosCriticos(status: ContratoStatus) {
  return status !== "RASCUNHO";
}

export interface ContratoItemProduto {
  nome: string;
  quantidade: number;
}

/** Item do contrato: é uma CÓPIA do serviço/orçamento no momento da inclusão. */
export interface ContratoItem {
  nome: string;
  origem_tipo: "SERVICO" | "GRUPO" | "MANUAL" | "ORCAMENTO";
  origem_nome: string | null;
  quantidade: number;
  valor_unitario: number | null;
  valor_custo: number | null;
  produtos: ContratoItemProduto[];
}

/** Tipo de ajuste no valor final do contrato. */
export type ContratoAjusteTipo = "DESCONTO" | "ACRESCIMO";

/**
 * Desconto ou acréscimo lançado no contrato. Podem existir vários no mesmo
 * contrato — cada um é um item adicional com valor e motivo próprios.
 * Quando o contrato nasce de um orçamento, os ajustes são copiados de lá.
 */
export interface ContratoAjuste {
  tipo: ContratoAjusteTipo;
  valor: number;
  descricao: string;
}

export interface Contrato {
  id: string;
  empresa_id: string;
  cliente_id: string;
  orcamento_id: string | null;
  titulo: string;
  status: ContratoStatus;
  data_contrato: string;
  inicio_vigencia: string | null;
  fim_vigencia: string | null;
  observacoes: string | null;
  created_at: string;
  cliente_nome: string;
  /** Descrição do orçamento aprovado que originou o contrato. */
  orcamento_descricao: string | null;
  /** Verdadeiro quando o fim da vigência já passou e o contrato segue aberto. */
  vencido: boolean;
  total_itens: number;
  total_valor: number | null;
  /** Descontos e acréscimos lançados no contrato (podem ser vários). */
  ajustes: ContratoAjuste[];
  /** Total dos serviços já com os descontos e acréscimos aplicados. */
  total_final: number | null;
}

export interface ContratoPayload {
  cliente_id: string;
  orcamento_id: string | null;
  titulo: string;
  status: ContratoStatus;
  data_contrato: string;
  inicio_vigencia: string | null;
  fim_vigencia: string | null;
  observacoes: string | null;
  itens: ContratoItem[];
  ajustes: ContratoAjuste[];
}

export function somarItensContrato(itens: ContratoItem[]): number | null {
  const comValor = itens.filter((i) => i.valor_unitario != null);
  if (comValor.length === 0) return null;
  return comValor.reduce((s, i) => s + Number(i.valor_unitario) * Number(i.quantidade || 1), 0);
}

/** Soma dos descontos e acréscimos (positivo aumenta, negativo diminui). */
export function somarAjustesContrato(ajustes: ContratoAjuste[]): number {
  return (ajustes ?? []).reduce(
    (s, a) => s + (a.tipo === "DESCONTO" ? -Number(a.valor || 0) : Number(a.valor || 0)),
    0,
  );
}

/** Aplica todos os descontos/acréscimos sobre o total dos serviços (nunca fica negativo). */
export function aplicarAjustesContrato(
  totalItens: number | null,
  ajustes: ContratoAjuste[],
): number | null {
  if (totalItens == null) return null;
  const final = totalItens + somarAjustesContrato(ajustes);
  return final < 0 ? 0 : final;
}

function mapearAjuste(a: any): ContratoAjuste {
  return {
    tipo: (a.tipo === "ACRESCIMO" ? "ACRESCIMO" : "DESCONTO") as ContratoAjusteTipo,
    valor: Number(a.valor ?? 0),
    descricao: String(a.descricao ?? ""),
  };
}


function mapearItem(i: any): ContratoItem {
  return {
    nome: i.nome,
    origem_tipo: (i.origem_tipo ?? "SERVICO") as ContratoItem["origem_tipo"],
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

function estaVencido(fim: string | null, status: ContratoStatus) {
  if (!fim) return false;
  if (status === "CONCLUIDO" || status === "CANCELADO") return false;
  const limite = new Date(`${fim}T23:59:59`);
  return limite.getTime() < Date.now();
}

/** Lista os contratos da empresa, com atualização em tempo real. */
export function useContratos() {
  const { data: empresaId } = useEmpresaAtual();
  const qc = useQueryClient();

  useEffect(() => {
    const invalidar = () => {
      qc.invalidateQueries({ queryKey: ["contratos"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["contrato"], refetchType: "active" });
    };
    const channel = supabase
      .channel("contratos-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "contratos" }, invalidar)
      .on("postgres_changes", { event: "*", schema: "public", table: "contrato_itens" }, invalidar)
      .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, invalidar)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["contratos", empresaId],
    enabled: Boolean(empresaId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Contrato[]> => {
      const { data, error } = await db
        .from("contratos")
        .select(
          "id, empresa_id, cliente_id, orcamento_id, titulo, status, data_contrato, inicio_vigencia, fim_vigencia, observacoes, created_at, clientes ( nome ), orcamentos ( descricao ), contrato_itens ( nome, origem_tipo, origem_nome, quantidade, valor_unitario, valor_custo, produtos )",
        )
        .eq("empresa_id", empresaId!)
        .order("data_contrato", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;

      return ((data ?? []) as any[]).map((c) => {
        const itens = ((c.contrato_itens ?? []) as any[]).map(mapearItem);
        return {
          id: c.id,
          empresa_id: c.empresa_id,
          cliente_id: c.cliente_id,
          orcamento_id: c.orcamento_id ?? null,
          titulo: c.titulo,
          status: c.status as ContratoStatus,
          data_contrato: c.data_contrato,
          inicio_vigencia: c.inicio_vigencia ?? null,
          fim_vigencia: c.fim_vigencia ?? null,
          observacoes: c.observacoes ?? null,
          created_at: c.created_at,
          cliente_nome: c.clientes?.nome ?? "Cliente removido",
          orcamento_descricao: c.orcamentos?.descricao ?? null,
          vencido: estaVencido(c.fim_vigencia ?? null, c.status as ContratoStatus),
          total_itens: itens.length,
          total_valor: somarItensContrato(itens),
        } as Contrato;
      });
    },
  });
}

/** Busca um contrato específico (tela de edição), já com os itens copiados. */
export function useContrato(id?: string) {
  return useQuery({
    queryKey: ["contrato", id],
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: async (): Promise<ContratoPayload | null> => {
      const { data, error } = await db
        .from("contratos")
        .select(
          "cliente_id, orcamento_id, titulo, status, data_contrato, inicio_vigencia, fim_vigencia, observacoes",
        )
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const c = data as any;

      const { data: itens, error: erroItens } = await db
        .from("contrato_itens")
        .select("nome, origem_tipo, origem_nome, quantidade, valor_unitario, valor_custo, produtos")
        .eq("contrato_id", id!)
        .order("ordem", { ascending: true });
      if (erroItens) throw erroItens;

      return {
        cliente_id: c.cliente_id,
        orcamento_id: c.orcamento_id ?? null,
        titulo: c.titulo,
        status: c.status as ContratoStatus,
        data_contrato: c.data_contrato,
        inicio_vigencia: c.inicio_vigencia ?? null,
        fim_vigencia: c.fim_vigencia ?? null,
        observacoes: c.observacoes ?? null,
        itens: ((itens ?? []) as any[]).map(mapearItem),
      };
    },
  });
}

/** Cria ou atualiza um contrato e regrava a lista de itens copiados. */
export function useSalvarContrato() {
  const qc = useQueryClient();
  const { data: empresaId } = useEmpresaAtual();

  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: ContratoPayload }) => {
      const valores = {
        cliente_id: dados.cliente_id,
        orcamento_id: dados.orcamento_id || null,
        titulo: dados.titulo.trim(),
        status: dados.status,
        data_contrato: dados.data_contrato,
        inicio_vigencia: dados.inicio_vigencia || null,
        fim_vigencia: dados.fim_vigencia || null,
        observacoes: dados.observacoes?.trim() || null,
      };

      let contratoId = id;
      let empresaDoContrato = empresaId;

      if (id) {
        const { data, error } = await db
          .from("contratos")
          .update(valores)
          .eq("id", id)
          .select("empresa_id")
          .single();
        if (error) throw error;
        empresaDoContrato = (data as { empresa_id: string }).empresa_id;
      } else {
        if (!empresaId) throw new Error("Empresa não identificada para o cadastro.");
        const { data, error } = await db
          .from("contratos")
          .insert({ ...valores, empresa_id: empresaId })
          .select("id, empresa_id")
          .single();
        if (error) throw error;
        contratoId = (data as { id: string }).id;
        empresaDoContrato = (data as { empresa_id: string }).empresa_id;
      }

      // Os itens são cópias: regravamos sempre a lista inteira, na ordem.
      const { error: erroLimpar } = await db
        .from("contrato_itens")
        .delete()
        .eq("contrato_id", contratoId!);
      if (erroLimpar) throw erroLimpar;

      if (dados.itens.length > 0) {
        const linhas = dados.itens.map((item, indice) => ({
          empresa_id: empresaDoContrato,
          contrato_id: contratoId,
          ordem: indice,
          origem_tipo: item.origem_tipo,
          origem_nome: item.origem_nome,
          nome: item.nome.trim().slice(0, 200),
          quantidade: item.quantidade > 0 ? item.quantidade : 1,
          valor_unitario: item.valor_unitario,
          valor_custo: item.valor_custo,
          produtos: item.produtos,
        }));
        const { error: erroItens } = await db.from("contrato_itens").insert(linhas);
        if (erroItens) throw erroItens;
      }

      return contratoId!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"], refetchType: "active" });
      qc.invalidateQueries({ queryKey: ["contrato"], refetchType: "active" });
    },
  });
}

/** Muda somente a situação do contrato (atalho da listagem). */
export function useSetContratoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ContratoStatus }) => {
      const { error } = await db.from("contratos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"], refetchType: "active" });
    },
  });
}

export function useDeleteContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("contratos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contratos"], refetchType: "active" });
    },
  });
}
