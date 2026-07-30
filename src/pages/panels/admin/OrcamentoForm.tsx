import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  GripVertical,
  Layers,
  Loader2,
  Package,
  Plus,
  Save,
  Trash2,
  Wrench,
} from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { HelpTip, InlineNote } from "@/components/page-help";
import { ADMIN_MENU } from "@/pages/panels/admin/menu";
import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import { formatMoney, maskMoney, parseMoney } from "@/lib/br-masks";
import { useClientes } from "@/hooks/use-clientes";
import { useLeads } from "@/hooks/use-leads";
import { useServicos } from "@/hooks/use-servicos";
import { useComposicaoDosServicos, useGruposServicos } from "@/hooks/use-grupos-servicos";
import { useProdutos } from "@/hooks/use-produtos";
import {
  ORCAMENTO_STATUS,
  somarItens,
  useOrcamento,
  useSalvarOrcamento,
  type OrcamentoItem,
  type OrcamentoStatus,
} from "@/hooks/use-orcamentos";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/searchable-select";

function hojeISO() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

function dataISO(d: Date) {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function diasEntre(inicio: string, fim: string) {
  const a = new Date(`${inicio}T00:00:00`);
  const b = new Date(`${fim}T00:00:00`);
  const diff = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function calcularValidade(dataOrcamento: string, dias: number | "") {
  if (!dataOrcamento || dias === "" || dias < 0) return null;
  const d = new Date(`${dataOrcamento}T00:00:00`);
  d.setDate(d.getDate() + Number(dias));
  return dataISO(d);
}

/** Item da proposta na tela: cópia editável + identificador só para arrastar. */
interface ItemLinha extends OrcamentoItem {
  chave: string;
  /** Texto mascarado do valor unitário (R$). */
  valorTexto: string;
  /** Texto da quantidade. */
  quantidadeTexto: string;
}

let contadorChave = 0;
function novaChave() {
  contadorChave += 1;
  return `item-${Date.now()}-${contadorChave}`;
}

/** Linha arrastável de um item do orçamento. */
function LinhaItem({
  id,
  children,
}: {
  id: string;
  children: (alcaProps: {
    setActivatorNodeRef: (node: HTMLElement | null) => void;
    listeners: Record<string, any> | undefined;
    attributes: Record<string, any>;
  }) => React.ReactNode;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-card px-3 py-3 ${
        isDragging ? "relative z-10 rounded-lg shadow-lg ring-1 ring-primary/40" : ""
      }`}
    >
      {children({ setActivatorNodeRef, listeners, attributes })}
    </li>
  );
}

/** Tela completa de cadastro e edição de um orçamento. */
export default function OrcamentoForm() {
  const { id } = useParams<{ id: string }>();
  const editando = Boolean(id);
  const navigate = useNavigate();

  usePageMeta(
    editando ? "Editar orçamento — JH7 Gestão Fotográfica" : "Novo orçamento — JH7 Gestão Fotográfica",
    "Monte a proposta para um cliente ou lead da sua empresa.",
  );

  const { data: orcamento, isLoading: carregando } = useOrcamento(id);
  const { data: clientes } = useClientes();
  const { data: leads } = useLeads();
  const { data: servicos } = useServicos();
  const { data: grupos } = useGruposServicos();
  const { data: produtos } = useProdutos();
  const { data: composicao } = useComposicaoDosServicos();
  const salvar = useSalvarOrcamento();

  const [clienteId, setClienteId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<OrcamentoStatus>("RASCUNHO");
  const [dataOrcamento, setDataOrcamento] = useState(hojeISO());
  const [diasValidade, setDiasValidade] = useState<number | "">(15);
  const [itens, setItens] = useState<ItemLinha[]>([]);
  const [escolhido, setEscolhido] = useState("");
  // Produto selecionado no combo de cada item (chave do item -> id do produto).
  const [produtoEscolhido, setProdutoEscolhido] = useState<Record<string, string>>({});
  const [carregado, setCarregado] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!editando || carregado) return;
    if (!orcamento) return;
    setClienteId(orcamento.cliente_id);
    setDescricao(orcamento.descricao);
    setStatus(orcamento.status);
    setDataOrcamento(orcamento.data_orcamento);
    setDiasValidade(
      orcamento.validade ? diasEntre(orcamento.data_orcamento, orcamento.validade) : "",
    );
    setItens(
      orcamento.itens.map((i) => ({
        ...i,
        chave: novaChave(),
        valorTexto: i.valor_unitario == null ? "" : formatMoney(i.valor_unitario),
        quantidadeTexto: String(i.quantidade ?? 1),
      })),
    );
    setCarregado(true);
  }, [editando, carregado, orcamento]);

  const dataValidadeCalculada = calcularValidade(dataOrcamento, diasValidade);

  const opcoesContato = useMemo(() => {
    const doCliente = (clientes ?? []).map((c) => ({
      value: c.id,
      label: c.nome,
      descricao: c.contato_whatsapp ? `Cliente · ${c.contato_whatsapp}` : "Cliente",
    }));
    const dosLeads = (leads ?? [])
      .filter((l) => l.situacao !== "CLIENTE")
      .map((l) => ({
        value: l.id,
        label: l.nome,
        descricao: l.contato_whatsapp ? `Lead · ${l.contato_whatsapp}` : "Lead",
      }));
    return [...doCliente, ...dosLeads].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [clientes, leads]);

  // Serviços e agrupamentos servem só como REFERÊNCIA para copiar os dados.
  const opcoesCatalogo = useMemo(() => {
    const dosServicos = (servicos ?? [])
      .filter((s) => s.status === "ATIVO")
      .map((s) => ({
        value: `s:${s.id}`,
        label: `Serviço · ${s.nome}`,
        descricao: s.valor_venda == null ? "Sem valor cadastrado" : `R$ ${formatMoney(s.valor_venda)}`,
      }));
    const dosGrupos = (grupos ?? [])
      .filter((g) => g.status === "ATIVO")
      .map((g) => ({
        value: `g:${g.id}`,
        label: `Agrupamento · ${g.nome}`,
        descricao: `${g.total_servicos} serviço(s)${
          g.total_venda == null ? "" : ` · R$ ${formatMoney(g.total_venda)}`
        }`,
      }));
    return [...dosServicos, ...dosGrupos];
  }, [servicos, grupos]);

  function adicionar() {
    if (!escolhido) {
      notifyValidation("Escolha um serviço ou agrupamento para incluir na proposta.");
      return;
    }
    const [tipo, refId] = escolhido.split(":");
    const novos: ItemLinha[] = [];

    if (tipo === "s") {
      const servico = (servicos ?? []).find((s) => s.id === refId);
      if (!servico) return;
      novos.push({
        chave: novaChave(),
        nome: servico.nome,
        origem_tipo: "SERVICO",
        origem_nome: null,
        quantidade: 1,
        quantidadeTexto: "1",
        valor_unitario: servico.valor_venda,
        valorTexto: servico.valor_venda == null ? "" : formatMoney(servico.valor_venda),
        valor_custo: servico.valor_custo,
        produtos: (composicao?.[servico.id] ?? []).map((p) => ({
          nome: p.nome,
          quantidade: p.quantidade,
        })),
      });
    } else {
      const grupo = (grupos ?? []).find((g) => g.id === refId);
      if (!grupo) return;
      grupo.servicos.forEach((s) => {
        novos.push({
          chave: novaChave(),
          nome: s.nome,
          origem_tipo: "GRUPO",
          origem_nome: grupo.nome,
          quantidade: 1,
          quantidadeTexto: "1",
          valor_unitario: s.valor_venda,
          valorTexto: s.valor_venda == null ? "" : formatMoney(s.valor_venda),
          valor_custo: null,
          produtos: s.produtos.map((p) => ({ nome: p.nome, quantidade: p.quantidade })),
        });
      });
      if (novos.length === 0) {
        notifyValidation("Este agrupamento ainda não tem serviços cadastrados.");
        return;
      }
    }

    setItens((atual) => [...atual, ...novos]);
    setEscolhido("");
  }

  function atualizarItem(chave: string, mudanca: Partial<ItemLinha>) {
    setItens((atual) => atual.map((i) => (i.chave === chave ? { ...i, ...mudanca } : i)));
  }

  // Produtos ativos do cadastro, usados apenas como referência para copiar.
  const opcoesProdutos = useMemo(
    () =>
      (produtos ?? [])
        .filter((p) => p.status === "ATIVO")
        .map((p) => ({
          value: p.id,
          label: p.nome,
          descricao: p.valor_custo == null ? "Sem custo cadastrado" : `Custo R$ ${formatMoney(p.valor_custo)}`,
        })),
    [produtos],
  );

  /** Inclui no serviço do orçamento uma cópia do produto escolhido. */
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

  function removerItem(chave: string) {
    setItens((atual) => atual.filter((i) => i.chave !== chave));
  }

  function aoSoltar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;
    setItens((atual) => {
      const de = atual.findIndex((i) => i.chave === active.id);
      const para = atual.findIndex((i) => i.chave === over.id);
      if (de < 0 || para < 0) return atual;
      return arrayMove(atual, de, para);
    });
  }

  const total = useMemo(() => somarItens(itens), [itens]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();

    if (!clienteId) {
      notifyValidation("Escolha o cliente ou lead deste orçamento.");
      return;
    }
    if (descricao.trim().length < 2) {
      notifyValidation("Informe uma descrição com pelo menos 2 letras.");
      return;
    }
    if (!dataOrcamento) {
      notifyValidation("Informe a data do orçamento.");
      return;
    }
    if (diasValidade !== "" && diasValidade < 0) {
      notifyValidation("A validade deve ter um número de dias positivo.");
      return;
    }
    if (itens.length === 0) {
      notifyValidation("Inclua pelo menos um serviço ou agrupamento na proposta.");
      return;
    }

    try {
      await salvar.mutateAsync({
        id,
        dados: {
          cliente_id: clienteId,
          descricao,
          status,
          data_orcamento: dataOrcamento,
          validade: calcularValidade(dataOrcamento, diasValidade),
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
        },
      });
      notifySuccess(editando ? "Orçamento atualizado." : "Orçamento criado.");
      navigate("/admin/orcamentos");
    } catch (err) {
      notifyError(err, { title: "Não foi possível salvar o orçamento" });
    }
  }

  return (
    <PanelLayout accent="admin" menu={ADMIN_MENU}>
      <div className="mx-auto w-full max-w-[var(--app-max-w)] space-y-[clamp(1.5rem,4vw,2rem)]">
        <header className="space-y-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 px-2"
            onClick={() => navigate("/admin/orcamentos")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a lista
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">
                {editando ? "Editar orçamento" : "Novo orçamento"}
              </h1>
              <HelpTip text="Preencha para quem é a proposta, o que ela contempla, em que situação está e até quando ela vale. Campos com * são obrigatórios." />
            </div>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
              Registre a proposta enviada para um cliente ou lead da sua empresa.
            </p>
          </div>
        </header>

        {carregando && editando ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando orçamento…
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-6">
            <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  Cliente ou lead *
                  <HelpTip text="Escolha para quem é a proposta. Aparecem os clientes cadastrados e também os leads (contatos que ainda não viraram clientes)." />
                </Label>
                <SearchableSelect
                  value={clienteId}
                  onChange={setClienteId}
                  opcoes={opcoesContato}
                  placeholder="Escolha o cliente ou lead"
                  placeholderBusca="Pesquisar pelo nome…"
                  vazio="Nenhum cliente ou lead encontrado."
                  ariaLabel="Cliente ou lead do orçamento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao" className="flex items-center gap-1.5">
                  Descrição *
                  <HelpTip text="Um nome curto para identificar a proposta, por exemplo: “Ensaio gestante — pacote completo”." />
                </Label>
                <Input
                  id="descricao"
                  value={descricao}
                  maxLength={200}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex.: Cobertura de casamento — pacote prata"
                />
              </div>

              <div className="space-y-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  Situação (somente leitura)
                  <HelpTip text="A situação mostra em que ponto a proposta está. Ela não é alterada por aqui: para mudar, use o botão de situação na lista de orçamentos." />
                </Label>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">
                    {rotuloStatus(status)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ORCAMENTO_STATUS.find((s) => s.valor === status)?.ajuda}
                  </span>
                </div>
                <InlineNote>
                  Para mudar a situação (enviado, aprovado, recusado ou cancelado), volte para a
                  lista de orçamentos e use o botão “Situação” do orçamento desejado.
                </InlineNote>
              </div>


              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="data" className="flex items-center gap-1.5">
                    Data do orçamento *
                    <HelpTip text="Dia em que a proposta foi montada ou apresentada ao cliente." />
                  </Label>
                  <Input
                    id="data"
                    type="date"
                    value={dataOrcamento}
                    onChange={(e) => setDataOrcamento(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validade" className="flex items-center gap-1.5">
                    Validade (dias)
                    <HelpTip text="Informe quantos dias a proposta fica válida a partir da data do orçamento. Deixe em branco se não quiser prazo." />
                  </Label>
                  <Input
                    id="validade"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="Ex.: 15"
                    value={diasValidade}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDiasValidade(v === "" ? "" : Math.max(0, Number(v)));
                    }}
                  />
                  {dataValidadeCalculada ? (
                    <p className="text-xs text-muted-foreground">
                      Validade até{" "}
                      <strong>
                        {new Date(`${dataValidadeCalculada}T00:00:00`).toLocaleDateString("pt-BR")}
                      </strong>
                    </p>
                  ) : null}
                </div>
              </div>

              <InlineNote>
                Depois que o prazo de validade terminar, o orçamento aparece na lista marcado como
                “Validade vencida” — assim você sabe quem precisa de um novo contato.
              </InlineNote>
            </section>

            {/* Serviços da proposta — cópia dos cadastros */}
            <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-semibold">Serviços da proposta *</h2>
                  <HelpTip text="Escolha um serviço ou um agrupamento já cadastrado. Ao incluir, os dados são COPIADOS para este orçamento: se depois você alterar ou excluir o cadastro, esta proposta continua igual." />
                </div>
                <p className="text-sm text-muted-foreground">
                  Os cadastros de serviços e agrupamentos servem apenas como referência. Tudo o que
                  você incluir aqui fica salvo dentro do orçamento e pode ser ajustado livremente.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <SearchableSelect
                  className="sm:flex-1"
                  value={escolhido}
                  onChange={setEscolhido}
                  opcoes={opcoesCatalogo}
                  placeholder="Escolha um serviço ou agrupamento"
                  placeholderBusca="Pesquisar serviço ou agrupamento…"
                  vazio="Nenhum serviço ou agrupamento ativo encontrado."
                  ariaLabel="Serviço ou agrupamento para incluir"
                />
                <Button type="button" variant="outline" className="gap-2" onClick={adicionar}>
                  <Plus className="h-4 w-4" />
                  Incluir na proposta
                </Button>
              </div>

              {itens.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nenhum serviço incluído ainda. Escolha acima um serviço ou agrupamento e clique em
                  “Incluir na proposta”.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                  onDragEnd={aoSoltar}
                >
                  <SortableContext
                    items={itens.map((i) => i.chave)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                      {itens.map((item) => (
                        <LinhaItem key={item.chave} id={item.chave}>
                          {({ setActivatorNodeRef, listeners, attributes }) => (
                            <div className="space-y-3">
                              <div className="flex items-start gap-2">
                                <button
                                  type="button"
                                  ref={setActivatorNodeRef}
                                  {...attributes}
                                  {...listeners}
                                  aria-label={`Arrastar ${item.nome} para mudar a ordem`}
                                  className="mt-1 cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </button>

                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center gap-1.5 text-sm font-medium">
                                    {item.origem_tipo === "GRUPO" ? (
                                      <Layers className="h-4 w-4 shrink-0 text-primary" />
                                    ) : (
                                      <Wrench className="h-4 w-4 shrink-0 text-primary" />
                                    )}
                                    <span className="truncate">{item.nome}</span>
                                  </div>
                                  {item.origem_nome ? (
                                    <p className="text-xs text-muted-foreground">
                                      Copiado do agrupamento “{item.origem_nome}”
                                    </p>
                                  ) : null}
                                  <p className="text-xs text-muted-foreground">
                                    {item.produtos.length === 0
                                      ? "Sem produtos incluídos neste serviço."
                                      : `${item.produtos.length} produto(s) incluído(s)`}
                                  </p>

                                </div>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Remover ${item.nome} da proposta`}
                                  onClick={() => removerItem(item.chave)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>

                              <div className="grid gap-3 pl-8 sm:grid-cols-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Valor unitário (R$)</Label>
                                  <Input
                                    inputMode="numeric"
                                    placeholder="0,00"
                                    value={item.valorTexto}
                                    onChange={(e) =>
                                      atualizarItem(item.chave, {
                                        valorTexto: maskMoney(e.target.value),
                                      })
                                    }
                                  />
                                </div>
                              </div>


                              {/* Produtos deste serviço — cópia editável */}
                              <div className="space-y-2 rounded-lg border border-dashed border-border p-3 pl-3 sm:ml-8">
                                <div className="flex items-center gap-1.5">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Produtos deste serviço
                                  </span>
                                  <HelpTip text="Estes produtos foram copiados do cadastro do serviço. Você pode incluir, remover ou mudar a quantidade só neste orçamento — o cadastro do serviço não muda." />
                                </div>

                                {item.produtos.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    Nenhum produto incluído. Use o campo abaixo para adicionar.
                                  </p>
                                ) : (
                                  <ul className="space-y-2">
                                    {item.produtos.map((p, indice) => (
                                      <li
                                        key={`${item.chave}-p-${indice}`}
                                        className="flex items-center gap-2"
                                      >
                                        <Input
                                          className="h-9 flex-1"
                                          value={p.nome}
                                          aria-label={`Nome do produto ${indice + 1}`}
                                          onChange={(e) =>
                                            atualizarProduto(item.chave, indice, {
                                              nome: e.target.value,
                                            })
                                          }
                                        />
                                        <Input
                                          className="h-9 w-20"
                                          inputMode="decimal"
                                          aria-label={`Quantidade de ${p.nome}`}
                                          value={String(p.quantidade)}
                                          onChange={(e) =>
                                            atualizarProduto(item.chave, indice, {
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
                                          onClick={() => removerProduto(item.chave, indice)}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </li>
                                    ))}
                                  </ul>
                                )}

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
                                    ariaLabel={`Produto para incluir em ${item.nome}`}
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
                              </div>

                            </div>
                          )}
                        </LinhaItem>
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}

              {itens.length > 0 ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    Total da proposta
                    <HelpTip text="Soma dos valores dos serviços incluídos na proposta." />
                  </span>
                  <strong className="text-lg">
                    {total == null
                      ? "Sem valores informados"
                      : `R$ ${formatMoney(
                          itens.reduce((s, i) => s + (parseMoney(i.valorTexto) ?? 0), 0),
                        )}`}

                  </strong>
                </div>
              ) : null}
            </section>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate("/admin/orcamentos")}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2" disabled={salvar.isPending}>
                {salvar.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {editando ? "Salvar alterações" : "Criar orçamento"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </PanelLayout>
  );
}
