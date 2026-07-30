import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  FileSignature,
  FileText,
  Loader2,
  Package,
  Plus,
  Save,
  Trash2,
  Wrench,
} from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { HelpTip, InlineNote } from "@/components/page-help";
import { ADMIN_MENU } from "@/pages/panels/admin/menu";
import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import { formatMoney, maskMoney, parseMoney } from "@/lib/br-masks";
import { SearchableSelect } from "@/components/searchable-select";

import { useClientes } from "@/hooks/use-clientes";
import { useServicos } from "@/hooks/use-servicos";
import { useProdutos } from "@/hooks/use-produtos";
import { useComposicaoDosServicos } from "@/hooks/use-grupos-servicos";
import { useOrcamento, useOrcamentos } from "@/hooks/use-orcamentos";
import { ehClienteAtivoConvertido } from "@/lib/clientes";

import {
  CONTRATO_STATUS,
  aplicarAjustesContrato,
  rotuloContratoStatus,
  somarItensContrato,
  useContrato,
  useSalvarContrato,
  type ContratoAjuste,
  type ContratoAjusteTipo,
  type ContratoItem,
  type ContratoStatus,
} from "@/hooks/use-contratos";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function paraISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Unidades aceitas para informar o prazo do contrato. */
type UnidadeVigencia = "DIAS" | "MESES" | "ANOS";

const UNIDADES: { valor: UnidadeVigencia; rotulo: string }[] = [
  { valor: "DIAS", rotulo: "dia(s)" },
  { valor: "MESES", rotulo: "mês(es)" },
  { valor: "ANOS", rotulo: "ano(s)" },
];

/**
 * Converte um prazo (quantidade + unidade) na data de fim da vigência.
 * Meses e anos usam o calendário: quando o dia não existe no mês de destino
 * (ex.: 31/01 + 1 mês), o sistema ajusta para o último dia daquele mês.
 */
function calcularFim(base: string, quantidade: number, unidade: UnidadeVigencia) {
  const d = new Date(`${base}T00:00:00`);
  if (Number.isNaN(d.getTime()) || quantidade <= 0) return "";

  if (unidade === "DIAS") {
    d.setDate(d.getDate() + quantidade);
    return paraISO(d);
  }

  const meses = unidade === "ANOS" ? quantidade * 12 : quantidade;
  const dia = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + meses);
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ultimoDia));
  return paraISO(d);
}


let contador = 0;
function novaChave() {
  contador += 1;
  return `linha-${Date.now()}-${contador}`;
}

interface ItemLinha extends ContratoItem {
  chave: string;
  valorTexto: string;
}

function paraLinha(item: ContratoItem): ItemLinha {
  return {
    ...item,
    chave: novaChave(),
    valorTexto: item.valor_unitario == null ? "" : formatMoney(item.valor_unitario),
  };
}

/** Linha de desconto ou acréscimo na tela (podem ser várias). */
interface AjusteLinha {
  chave: string;
  tipo: ContratoAjusteTipo;
  /** Texto mascarado do valor (R$). */
  valorTexto: string;
  descricao: string;
}

/** Cadastro de contrato em tela cheia: criação, edição e visualização. */
export default function ContratoForm() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const edicao = Boolean(id && id !== "novo");
  const somenteLeitura = params.get("modo") === "ver";
  const voltarPara = params.get("voltar")
    ? decodeURIComponent(params.get("voltar")!)
    : "/admin/contratos";
  const clientePreSelecionado = params.get("cliente") ?? "";
  const orcamentoPreSelecionado = params.get("orcamento") ?? "";

  usePageMeta(
    edicao
      ? "Editar contrato — JH7 Gestão de Estúdios Fotográficos"
      : "Novo contrato — JH7 Gestão de Estúdios Fotográficos",
    "Formalize com o cliente os serviços aprovados no orçamento.",
  );

  const { data: clientes } = useClientes();
  const { data: orcamentos } = useOrcamentos();
  const { data: servicos } = useServicos();
  const { data: produtos } = useProdutos();
  const { data: composicao } = useComposicaoDosServicos();
  const { data: contratoSalvo, isLoading } = useContrato(edicao ? id : undefined);
  const salvar = useSalvarContrato();

  const [clienteId, setClienteId] = useState(clientePreSelecionado);
  const [orcamentoId, setOrcamentoId] = useState(orcamentoPreSelecionado);
  const [titulo, setTitulo] = useState("");
  const [status, setStatus] = useState<ContratoStatus>("RASCUNHO");
  const [dataContrato, setDataContrato] = useState(hojeISO());
  const [inicio, setInicio] = useState(hojeISO());
  const [fim, setFim] = useState("");
  /** Prazo informado pelo usuário (quantidade + unidade) que gera a data de fim. */
  const [prazoQtd, setPrazoQtd] = useState("");
  const [prazoUnidade, setPrazoUnidade] = useState<UnidadeVigencia>("MESES");

  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemLinha[]>([]);
  const [ajustes, setAjustes] = useState<AjusteLinha[]>([]);
  const [servicoEscolhido, setServicoEscolhido] = useState("");
  /** Produto selecionado no combo de cada serviço (chave do item -> id do produto). */
  const [produtoEscolhido, setProdutoEscolhido] = useState<Record<string, string>>({});
  const [carregado, setCarregado] = useState(false);
  /** Orçamento cujos itens já foram copiados, para não copiar duas vezes. */
  const [copiadoDe, setCopiadoDe] = useState("");

  const { data: orcamentoDetalhe } = useOrcamento(orcamentoId || undefined);

  // Carrega o contrato existente uma única vez.
  useEffect(() => {
    if (!edicao || !contratoSalvo || carregado) return;
    setClienteId(contratoSalvo.cliente_id);
    setOrcamentoId(contratoSalvo.orcamento_id ?? "");
    setCopiadoDe(contratoSalvo.orcamento_id ?? "");
    setTitulo(contratoSalvo.titulo);
    setStatus(contratoSalvo.status);
    setDataContrato(contratoSalvo.data_contrato);
    setInicio(contratoSalvo.inicio_vigencia ?? "");
    setFim(contratoSalvo.fim_vigencia ?? "");
    setObservacoes(contratoSalvo.observacoes ?? "");
    setItens(contratoSalvo.itens.map(paraLinha));
    setAjustes(
      (contratoSalvo.ajustes ?? []).map((a) => ({
        chave: novaChave(),
        tipo: a.tipo,
        valorTexto: formatMoney(Number(a.valor ?? 0)),
        descricao: a.descricao ?? "",
      })),
    );
    setCarregado(true);
  }, [edicao, contratoSalvo, carregado]);

  // Prazo informado (dias/meses/anos) -> data de fim da vigência.
  const fimCalculado = useMemo(() => {
    const qtd = Number(prazoQtd);
    if (!prazoQtd || !Number.isFinite(qtd) || qtd <= 0) return "";
    return calcularFim(inicio || dataContrato || hojeISO(), Math.floor(qtd), prazoUnidade);
  }, [prazoQtd, prazoUnidade, inicio, dataContrato]);

  // Sempre que houver prazo válido, a data de fim acompanha o cálculo.
  useEffect(() => {
    if (somenteLeitura) return;
    if (!fimCalculado) return;
    setFim((atual) => (atual === fimCalculado ? atual : fimCalculado));
  }, [fimCalculado, somenteLeitura]);



  // Só entram na lista os clientes de verdade e ativos. Quem veio de um lead e
  // já completou o cadastro (documento preenchido) conta como cliente; quem
  // ainda é lead em aberto fica de fora. A regra é a mesma usada no módulo de
  // Leads (ver src/lib/clientes.ts) para não haver divergência entre as telas.
  const clientesAtivos = useMemo(
    () =>
      (clientes ?? []).filter((c) => {
        if (c.id === clienteId) return true; // mantém o cliente já vinculado ao contrato
        return ehClienteAtivoConvertido(c);
      }),
    [clientes, clienteId],
  );



  // Somente orçamentos aprovados do cliente escolhido podem virar contrato.
  const orcamentosAprovados = useMemo(
    () =>
      (orcamentos ?? []).filter(
        (o) => o.status === "APROVADO" && (!clienteId || o.cliente_id === clienteId),
      ),
    [orcamentos, clienteId],
  );

  // Ao escolher um orçamento aprovado, copiamos os serviços para o contrato.
  useEffect(() => {
    if (somenteLeitura) return;
    if (!orcamentoId || orcamentoId === copiadoDe) return;
    if (!orcamentoDetalhe) return;

    setItens(
      orcamentoDetalhe.itens.map((i) =>
        paraLinha({
          nome: i.nome,
          origem_tipo: "ORCAMENTO",
          origem_nome: i.origem_nome ?? orcamentoDetalhe.descricao,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario,
          valor_custo: i.valor_custo,
          produtos: i.produtos,
        }),
      ),
    );
    // Descontos e acréscimos da proposta também vêm junto: o contrato
    // precisa fechar no mesmo valor final que o cliente aprovou.
    setAjustes(
      (orcamentoDetalhe.ajustes ?? []).map((a) => ({
        chave: novaChave(),
        tipo: a.tipo,
        valorTexto: formatMoney(Number(a.valor ?? 0)),
        descricao: a.descricao ?? "",
      })),
    );
    setCopiadoDe(orcamentoId);
    if (!clienteId) setClienteId(orcamentoDetalhe.cliente_id);
    if (!titulo.trim()) setTitulo(`Contrato — ${orcamentoDetalhe.descricao}`);
    notifySuccess(
      (orcamentoDetalhe.ajustes ?? []).length > 0
        ? "Os serviços, produtos e os descontos/acréscimos do orçamento aprovado foram copiados para o contrato. Você ainda pode ajustar tudo antes de salvar."
        : "Os serviços do orçamento aprovado foram copiados para o contrato. Você ainda pode ajustar os valores antes de salvar.",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentoId, orcamentoDetalhe, copiadoDe, somenteLeitura]);

  const totalItens = useMemo(
    () =>
      somarItensContrato(
        itens.map((i) => ({ ...i, valor_unitario: parseMoney(i.valorTexto) })),
      ),
    [itens],
  );

  const ajustesAplicados: ContratoAjuste[] = useMemo(
    () =>
      ajustes.map((a) => ({
        tipo: a.tipo,
        valor: parseMoney(a.valorTexto) ?? 0,
        descricao: a.descricao,
      })),
    [ajustes],
  );
  const totalFinal = aplicarAjustesContrato(totalItens, ajustesAplicados);

  function adicionarAjuste(tipo: ContratoAjusteTipo) {
    setAjustes((atual) => [...atual, { chave: novaChave(), tipo, valorTexto: "", descricao: "" }]);
  }

  function atualizarAjuste(chave: string, campos: Partial<AjusteLinha>) {
    setAjustes((atual) => atual.map((a) => (a.chave === chave ? { ...a, ...campos } : a)));
  }

  function removerAjuste(chave: string) {
    setAjustes((atual) => atual.filter((a) => a.chave !== chave));
  }

  // Produtos ativos do cadastro, usados apenas como referência para copiar.
  const opcoesProdutos = useMemo(
    () =>
      (produtos ?? [])
        .filter((p) => p.status === "ATIVO")
        .map((p) => ({
          value: p.id,
          label: p.nome,
          descricao:
            p.valor_custo == null ? "Sem custo cadastrado" : `Custo R$ ${formatMoney(p.valor_custo)}`,
        })),
    [produtos],
  );

  /** Inclui no serviço do contrato uma cópia do produto escolhido. */
  function adicionarProduto(chave: string) {
    const produtoId = produtoEscolhido[chave];
    if (!produtoId) {
      notifyValidation("Escolha um produto para incluir neste serviço.");
      return;
    }
    const produto = (produtos ?? []).find((p) => p.id === produtoId);
    if (!produto) return;

    setItens((atual) =>
      atual.map((i) =>
        i.chave === chave
          ? { ...i, produtos: [...i.produtos, { nome: produto.nome, quantidade: 1 }] }
          : i,
      ),
    );
    setProdutoEscolhido((atual) => ({ ...atual, [chave]: "" }));
  }

  function atualizarProduto(
    chave: string,
    indice: number,
    mudanca: Partial<{ nome: string; quantidade: number }>,
  ) {
    setItens((atual) =>
      atual.map((i) =>
        i.chave === chave
          ? {
              ...i,
              produtos: i.produtos.map((p, pos) => (pos === indice ? { ...p, ...mudanca } : p)),
            }
          : i,
      ),
    );
  }

  function removerProduto(chave: string, indice: number) {
    setItens((atual) =>
      atual.map((i) =>
        i.chave === chave ? { ...i, produtos: i.produtos.filter((_, pos) => pos !== indice) } : i,
      ),
    );
  }


  function adicionarServico() {
    const servico = (servicos ?? []).find((s) => s.id === servicoEscolhido);
    if (!servico) {
      notifyValidation("Escolha um serviço na lista para incluir no contrato.");
      return;
    }
    setItens((atual) => [
      ...atual,
      paraLinha({
        nome: servico.nome,
        origem_tipo: "SERVICO",
        origem_nome: servico.nome,
        quantidade: 1,
        valor_unitario: servico.valor_venda,
        valor_custo: servico.valor_custo,
        produtos: (composicao?.[servico.id] ?? []).map((p) => ({
          nome: p.nome,
          quantidade: p.quantidade,
        })),
      }),
    ]);
    setServicoEscolhido("");
  }

  function adicionarManual() {
    setItens((atual) => [
      ...atual,
      paraLinha({
        nome: "",
        origem_tipo: "MANUAL",
        origem_nome: null,
        quantidade: 1,
        valor_unitario: null,
        valor_custo: null,
        produtos: [],
      }),
    ]);
  }

  async function submeter() {
    if (somenteLeitura) return;
    if (!clienteId) {
      notifyValidation("Escolha o cliente do contrato. Esse campo é obrigatório.");
      return;
    }
    if (!titulo.trim()) {
      notifyValidation("Informe um título para o contrato, por exemplo “Ensaio gestante 2026”.");
      return;
    }
    if (!dataContrato) {
      notifyValidation("Informe a data do contrato.");
      return;
    }
    if (inicio && fim && fim < inicio) {
      notifyValidation("A data de fim da vigência não pode ser anterior à data de início.");
      return;
    }
    if (itens.length === 0) {
      notifyValidation(
        "Inclua pelo menos um serviço no contrato. Você pode gerar a partir de um orçamento aprovado ou adicionar serviços do seu cadastro.",
      );
      return;
    }
    if (itens.some((i) => !i.nome.trim())) {
      notifyValidation("Todo serviço do contrato precisa de um nome. Revise a lista.");
      return;
    }
    if (ajustesAplicados.some((a) => a.valor <= 0)) {
      notifyValidation(
        "Informe um valor maior que zero em cada desconto ou acréscimo, ou remova a linha.",
      );
      return;
    }
    if (ajustesAplicados.some((a) => a.descricao.trim().length < 2)) {
      notifyValidation("Escreva o motivo de cada desconto ou acréscimo.");
      return;
    }

    try {
      await salvar.mutateAsync({
        id: edicao ? id : undefined,
        dados: {
          cliente_id: clienteId,
          orcamento_id: orcamentoId || null,
          titulo,
          status,
          data_contrato: dataContrato,
          inicio_vigencia: inicio || null,
          fim_vigencia: fim || null,
          observacoes,
          itens: itens.map((i) => ({
            nome: i.nome,
            origem_tipo: i.origem_tipo,
            origem_nome: i.origem_nome,
            quantidade: 1,
            valor_unitario: parseMoney(i.valorTexto),
            valor_custo: i.valor_custo,
            produtos: i.produtos
              .filter((p) => p.nome.trim().length > 0)
              .map((p) => ({
                nome: p.nome.trim(),
                quantidade: p.quantidade > 0 ? p.quantidade : 1,
              })),
          })),
          ajustes: ajustesAplicados.map((a) => ({ ...a, descricao: a.descricao.trim() })),
        },
      });
      notifySuccess(edicao ? "Contrato atualizado." : "Contrato criado.");
      navigate(voltarPara);
    } catch (err) {
      notifyError(err, { title: "Não foi possível salvar o contrato" });
    }
  }

  if (edicao && isLoading) {
    return (
      <PanelLayout accent="admin" menu={ADMIN_MENU}>
        <div className="mx-auto flex w-full max-w-[var(--app-max-w)] items-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando contrato…
        </div>
      </PanelLayout>
    );
  }

  return (
    <PanelLayout accent="admin" menu={ADMIN_MENU}>
      <div className="mx-auto w-full max-w-[var(--app-max-w)] space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 gap-2"
              onClick={() => navigate(voltarPara)}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="flex items-center gap-1.5">
              <h1 className="text-[clamp(1.35rem,4.5vw,1.9rem)] font-bold tracking-tight">
                {somenteLeitura
                  ? "Visualizar contrato"
                  : edicao
                    ? "Editar contrato"
                    : "Novo contrato"}
              </h1>
              <HelpTip text="Preencha os dados do contrato, escolha o cliente e, se quiser, um orçamento já aprovado. Ao escolher o orçamento, todos os serviços dele são copiados para cá — as alterações que você fizer aqui não mexem no orçamento original. Campos marcados com * são obrigatórios." />
            </div>
            <p className="text-sm text-muted-foreground">
              Formalize com o cliente os serviços aprovados e registre o período de execução.
            </p>
          </div>
          {somenteLeitura ? null : (
            <Button className="tap-target gap-2" onClick={submeter} disabled={salvar.isPending}>
              {salvar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar contrato
            </Button>
          )}
        </header>

        {somenteLeitura ? (
          <InlineNote>
            Este contrato já saiu da situação “Rascunho”, então está aberto apenas para consulta.
            Para mudar a situação, use o botão “Situação” na lista de contratos.
          </InlineNote>
        ) : null}

        {/* Cada grupo de informações fica em uma aba, para a tela não ficar longa */}
        <Tabs defaultValue="dados" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="dados">Dados do contrato</TabsTrigger>
            <TabsTrigger value="vigencia">Vigência</TabsTrigger>
            <TabsTrigger value="servicos">
              Serviços{itens.length > 0 ? ` (${itens.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="valores">
              Descontos e acréscimos{ajustes.length > 0 ? ` (${ajustes.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="observacoes">Observações</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-0">
        <section className="space-y-4 rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <FileSignature className="h-4 w-4" /> Dados do contrato
          </h2>


          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                Cliente *
                <HelpTip text="Aparecem aqui apenas clientes ativos — inclusive os que começaram como lead e já foram convertidos em cliente. Contatos que ainda são leads e clientes inativos não podem assinar contrato: converta o lead ou reative o cliente antes." />
              </Label>
              <SearchableSelect
                value={clienteId}
                onChange={(v) => {
                  setClienteId(v);
                  setOrcamentoId("");
                }}
                disabled={somenteLeitura || Boolean(clientePreSelecionado) || edicao}
                ariaLabel="Cliente do contrato"
                placeholder="Escolha o cliente"
                opcoes={clientesAtivos.map((c) => ({
                  value: c.id,
                  label: c.nome,
                  descricao: c.contato_whatsapp ?? undefined,
                }))}
              />
              {clientePreSelecionado || edicao ? (
                <p className="text-xs text-muted-foreground">
                  O cliente do contrato não pode ser trocado depois de criado.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                Orçamento aprovado (opcional)
                <HelpTip text="Ao escolher um orçamento aprovado deste cliente, os serviços e produtos da proposta são copiados para o contrato. Só aparecem aqui orçamentos com a situação “Aprovado”." />
              </Label>
              <SearchableSelect
                value={orcamentoId}
                onChange={setOrcamentoId}
                disabled={somenteLeitura || !clienteId}
                ariaLabel="Orçamento aprovado que origina o contrato"
                placeholder={
                  clienteId ? "Escolha um orçamento aprovado" : "Escolha primeiro o cliente"
                }
                vazio="Este cliente não tem orçamentos aprovados."
                opcoes={orcamentosAprovados.map((o) => ({
                  value: o.id,
                  label: o.descricao || "Orçamento sem descrição",
                  descricao:
                    o.total_final == null ? "Sem valor informado" : formatMoney(o.total_final),
                }))}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="titulo" className="flex items-center gap-1.5">
                Título do contrato *
                <HelpTip text="Um nome curto para identificar o contrato na lista, por exemplo “Casamento Ana e João — pacote completo”." />
              </Label>
              <Input
                id="titulo"
                value={titulo}
                readOnly={somenteLeitura}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Casamento Ana e João — pacote completo"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="data" className="flex items-center gap-1.5">
                Data do contrato *
                <HelpTip text="Dia em que o contrato foi feito/assinado com o cliente." />
              </Label>
              <Input
                id="data"
                type="date"
                value={dataContrato}
                readOnly={somenteLeitura}
                onChange={(e) => setDataContrato(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                Situação
                <HelpTip text="No cadastro a situação é apenas informativa. Toda movimentação (assinado, vigente, concluído, cancelado) é feita pelo botão “Situação” na lista de contratos." />
              </Label>
              <Input value={rotuloContratoStatus(status)} readOnly className="bg-muted/40" />
              <p className="text-xs text-muted-foreground">
                {CONTRATO_STATUS.find((s) => s.valor === status)?.ajuda}
              </p>
            </div>
          </div>
        </section>
          </TabsContent>

          <TabsContent value="vigencia" className="mt-0">
        <section className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="space-y-1">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <FileSignature className="h-4 w-4" /> Vigência do contrato
              <HelpTip text="Período em que o contrato vale. Informe o início e o prazo (dias, meses ou anos) — o sistema calcula a data de fim." />
            </h2>
            <p className="text-sm text-muted-foreground">
              Opcional: preencha se o contrato tem um período definido de execução.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">


            <div className="space-y-1.5">
              <Label htmlFor="inicio" className="flex items-center gap-1.5">
                Início da vigência
                <HelpTip text="A partir de quando os serviços do contrato começam a valer." />
              </Label>
              <Input
                id="inicio"
                type="date"
                value={inicio}
                readOnly={somenteLeitura}
                onChange={(e) => setInicio(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prazo" className="flex items-center gap-1.5">
                Prazo da vigência
                <HelpTip text="Informe a quantidade e escolha se é em dias, meses ou anos. O sistema calcula automaticamente a data de fim a partir do início da vigência. Meses e anos seguem o calendário (ex.: 15/03 + 1 ano = 15/03 do ano seguinte)." />
              </Label>
              <div className="flex gap-2">
                <Input
                  id="prazo"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="Ex.: 12"
                  value={prazoQtd}
                  readOnly={somenteLeitura}
                  onChange={(e) => setPrazoQtd(e.target.value)}
                  className="w-28"
                />
                <select
                  aria-label="Unidade do prazo"
                  value={prazoUnidade}
                  disabled={somenteLeitura}
                  onChange={(e) => setPrazoUnidade(e.target.value as UnidadeVigencia)}
                  className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                >
                  {UNIDADES.map((u) => (
                    <option key={u.valor} value={u.valor}>
                      {u.rotulo}
                    </option>
                  ))}
                </select>
              </div>
              {somenteLeitura ? null : (
                <p className="text-xs text-muted-foreground">
                  {fimCalculado
                    ? `Fim da vigência calculado: ${fimCalculado.split("-").reverse().join("/")}`
                    : "Informe a quantidade para o sistema calcular a data de fim."}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fim" className="flex items-center gap-1.5">
                Fim da vigência
                <HelpTip text="Calculado automaticamente pelo prazo informado. Você também pode ajustar a data manualmente, se precisar." />
              </Label>
              <Input
                id="fim"
                type="date"
                value={fim}
                readOnly={somenteLeitura}
                onChange={(e) => {
                  setFim(e.target.value);
                  setPrazoQtd(""); // data ajustada na mão: o prazo deixa de mandar
                }}
              />
            </div>
          </div>
        </section>
          </TabsContent>

          <TabsContent value="servicos" className="mt-0">
        <section className="space-y-4 rounded-xl border border-border bg-card p-4">

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Wrench className="h-4 w-4" /> Serviços do contrato
              <HelpTip text="Os serviços aqui são cópias: o que você alterar não muda o cadastro de serviços nem o orçamento de origem. Assim o contrato guarda exatamente o que foi combinado com o cliente." />
            </h2>
            <span className="text-sm">
              Total dos serviços:{" "}
              <strong>
                {totalItens == null ? "sem valores informados" : formatMoney(totalItens)}
              </strong>
            </span>
          </div>

          {somenteLeitura ? null : (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[16rem] flex-1 space-y-1.5">
                <Label className="text-xs">Incluir um serviço do seu cadastro</Label>
                <SearchableSelect
                  value={servicoEscolhido}
                  onChange={setServicoEscolhido}
                  ariaLabel="Serviço para incluir no contrato"
                  placeholder="Escolha um serviço"
                  opcoes={(servicos ?? [])
                    .filter((s) => s.status === "ATIVO")
                    .map((s) => ({
                      value: s.id,
                      label: s.nome,
                      descricao:
                        s.valor_venda == null ? "Sem valor de venda" : formatMoney(s.valor_venda),
                    }))}
                />
              </div>
              <Button type="button" variant="outline" className="gap-2" onClick={adicionarServico}>
                <Plus className="h-4 w-4" /> Incluir serviço
              </Button>
              <Button type="button" variant="ghost" className="gap-2" onClick={adicionarManual}>
                <Plus className="h-4 w-4" /> Item avulso
              </Button>
            </div>
          )}

          {itens.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-semibold">Nenhum serviço no contrato ainda</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha um orçamento aprovado acima para copiar os serviços dele, ou inclua
                serviços do seu cadastro.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {itens.map((item, indice) => (
                <li key={item.chave} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[14rem] flex-1 space-y-1.5">
                      <Label className="text-xs">Serviço *</Label>
                      <Input
                        value={item.nome}
                        readOnly={somenteLeitura}
                        onChange={(e) =>
                          setItens((atual) =>
                            atual.map((l, i) =>
                              i === indice ? { ...l, nome: e.target.value } : l,
                            ),
                          )
                        }
                        placeholder="Nome do serviço"
                      />
                    </div>
                    <div className="w-40 space-y-1.5">
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input
                        value={item.valorTexto}
                        readOnly={somenteLeitura}
                        inputMode="numeric"
                        onChange={(e) =>
                          setItens((atual) =>
                            atual.map((l, i) =>
                              i === indice
                                ? { ...l, valorTexto: maskMoney(e.target.value) }
                                : l,
                            ),
                          )
                        }
                        placeholder="0,00"
                      />
                    </div>
                    {somenteLeitura ? null : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ${item.nome || "item"} do contrato`}
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          setItens((atual) => atual.filter((_, i) => i !== indice))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Produtos deste serviço — cópia editável, igual ao orçamento */}
                  <div className="mt-3 space-y-2 rounded-lg border border-dashed border-border p-3">
                    <div className="flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Produtos deste serviço
                      </span>
                      <HelpTip text="Estes produtos foram copiados do cadastro do serviço ou do orçamento. Você pode incluir, remover ou mudar a quantidade só neste contrato — o cadastro e o orçamento não mudam." />
                    </div>

                    {item.produtos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {somenteLeitura
                          ? "Nenhum produto incluído neste serviço."
                          : "Nenhum produto incluído. Use o campo abaixo para adicionar."}
                      </p>
                    ) : somenteLeitura ? (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {item.produtos.map((p, i) => (
                          <span
                            key={`${item.chave}-p-${i}`}
                            className="rounded-full border border-border px-2 py-0.5"
                          >
                            {p.quantidade}x {p.nome}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {item.produtos.map((p, pIndice) => (
                          <li key={`${item.chave}-p-${pIndice}`} className="flex items-center gap-2">
                            <Input
                              className="h-9 flex-1"
                              value={p.nome}
                              aria-label={`Nome do produto ${pIndice + 1}`}
                              onChange={(e) =>
                                atualizarProduto(item.chave, pIndice, { nome: e.target.value })
                              }
                            />
                            <Input
                              className="h-9 w-20"
                              inputMode="decimal"
                              aria-label={`Quantidade de ${p.nome}`}
                              value={String(p.quantidade)}
                              onChange={(e) =>
                                atualizarProduto(item.chave, pIndice, {
                                  quantidade:
                                    Number(
                                      e.target.value.replace(/[^\d,.]/g, "").replace(",", "."),
                                    ) || 0,
                                })
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              aria-label={`Remover o produto ${p.nome} deste serviço`}
                              onClick={() => removerProduto(item.chave, pIndice)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {somenteLeitura ? null : (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <SearchableSelect
                          className="sm:flex-1"
                          value={produtoEscolhido[item.chave] ?? ""}
                          onChange={(v) =>
                            setProdutoEscolhido((atual) => ({ ...atual, [item.chave]: v }))
                          }
                          opcoes={opcoesProdutos}
                          placeholder="Escolha um produto para incluir"
                          placeholderBusca="Pesquisar produto…"
                          vazio="Nenhum produto ativo encontrado."
                          ariaLabel={`Produto para incluir em ${item.nome || "serviço"}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => adicionarProduto(item.chave)}
                        >
                          <Plus className="h-4 w-4" />
                          Incluir produto
                        </Button>
                      </div>
                    )}
                  </div>

                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Descontos e acréscimos (vários por contrato) */}
        <section className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="space-y-1">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Wrench className="h-4 w-4" /> Descontos e acréscimos
              <HelpTip text="São itens adicionais do contrato. Você pode lançar quantos quiser: cada desconto diminui e cada acréscimo aumenta o valor final. Quando o contrato vem de um orçamento aprovado, os descontos e acréscimos da proposta já vêm copiados." />
            </h2>
            <p className="text-sm text-muted-foreground">
              Opcional. Lance quantos descontos e acréscimos precisar, cada um com valor e motivo —
              assim o cliente entende como chegou no valor final do contrato.
            </p>
          </div>

          {somenteLeitura ? null : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => adicionarAjuste("DESCONTO")}
              >
                <Plus className="h-4 w-4" />
                Adicionar desconto
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => adicionarAjuste("ACRESCIMO")}
              >
                <Plus className="h-4 w-4" />
                Adicionar acréscimo
              </Button>
            </div>
          )}

          {ajustes.length === 0 ? (
            <InlineNote>
              Nenhum desconto ou acréscimo lançado: o valor final é a soma dos serviços.
            </InlineNote>
          ) : (
            <div className="space-y-3">
              {ajustes.map((a) => (
                <div
                  key={a.chave}
                  className="space-y-3 rounded-lg border border-border bg-muted/30 p-3 sm:p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={somenteLeitura}
                        variant={a.tipo === "DESCONTO" ? "default" : "outline"}
                        onClick={() => atualizarAjuste(a.chave, { tipo: "DESCONTO" })}
                      >
                        Desconto (diminui)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={somenteLeitura}
                        variant={a.tipo === "ACRESCIMO" ? "default" : "outline"}
                        onClick={() => atualizarAjuste(a.chave, { tipo: "ACRESCIMO" })}
                      >
                        Acréscimo (aumenta)
                      </Button>
                    </div>
                    {somenteLeitura ? null : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="gap-2 text-destructive"
                        onClick={() => removerAjuste(a.chave)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`ajuste-valor-${a.chave}`} className="flex items-center gap-1.5">
                        {a.tipo === "DESCONTO"
                          ? "Valor do desconto (R$) *"
                          : "Valor do acréscimo (R$) *"}
                        <HelpTip
                          text={
                            a.tipo === "DESCONTO"
                              ? "Quanto será abatido do total dos serviços."
                              : "Quanto será somado ao total dos serviços (por exemplo, deslocamento ou hora extra)."
                          }
                        />
                      </Label>
                      <Input
                        id={`ajuste-valor-${a.chave}`}
                        inputMode="numeric"
                        placeholder="0,00"
                        readOnly={somenteLeitura}
                        value={a.valorTexto}
                        onChange={(e) =>
                          atualizarAjuste(a.chave, { valorTexto: maskMoney(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor={`ajuste-descricao-${a.chave}`}
                        className="flex items-center gap-1.5"
                      >
                        Motivo *
                        <HelpTip text="Explique em poucas palavras, por exemplo: “Desconto para pagamento à vista” ou “Acréscimo por deslocamento”." />
                      </Label>
                      <Input
                        id={`ajuste-descricao-${a.chave}`}
                        maxLength={200}
                        readOnly={somenteLeitura}
                        value={a.descricao}
                        onChange={(e) => atualizarAjuste(a.chave, { descricao: e.target.value })}
                        placeholder={
                          a.tipo === "DESCONTO"
                            ? "Ex.: Desconto para pagamento à vista"
                            : "Ex.: Acréscimo por deslocamento"
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total dos serviços</span>
              <span>{totalItens == null ? "—" : `R$ ${formatMoney(totalItens)}`}</span>
            </div>
            {ajustesAplicados
              .filter((a) => a.valor > 0)
              .map((a, indice) => (
                <div
                  key={`resumo-${indice}`}
                  className="flex items-center justify-between gap-3 text-sm text-muted-foreground"
                >
                  <span className="truncate">
                    {a.tipo === "DESCONTO" ? "Desconto" : "Acréscimo"}
                    {a.descricao.trim() ? ` · ${a.descricao.trim()}` : ""}
                  </span>
                  <span className="whitespace-nowrap">
                    {a.tipo === "DESCONTO" ? "− " : "+ "}
                    R$ {formatMoney(a.valor)}
                  </span>
                </div>
              ))}
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                Valor final do contrato
                <HelpTip text="É o total dos serviços já com todos os descontos abatidos e os acréscimos somados. Esse é o valor que o cliente vai pagar." />
              </span>
              <strong className="text-lg">
                {totalFinal == null ? "Sem valores informados" : `R$ ${formatMoney(totalFinal)}`}
              </strong>
            </div>
          </div>
        </section>



        <section className="space-y-2 rounded-xl border border-border bg-card p-4">
          <Label htmlFor="obs" className="flex items-center gap-1.5">
            Observações do contrato
            <HelpTip text="Combinados que não cabem nos serviços: forma de pagamento, prazo de entrega das fotos, regras de remarcação etc." />
          </Label>
          <Textarea
            id="obs"
            value={observacoes}
            readOnly={somenteLeitura}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={4}
            placeholder="Ex.: pagamento em 3x, entrega das fotos em até 30 dias após o ensaio."
          />
        </section>

        <div className="flex flex-wrap justify-end gap-2 pb-6">
          <Button type="button" variant="outline" onClick={() => navigate(voltarPara)}>
            {somenteLeitura ? "Voltar" : "Cancelar"}
          </Button>
          {somenteLeitura ? null : (
            <Button className="gap-2" onClick={submeter} disabled={salvar.isPending}>
              {salvar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar contrato
            </Button>
          )}
        </div>
      </div>
    </PanelLayout>
  );
}
