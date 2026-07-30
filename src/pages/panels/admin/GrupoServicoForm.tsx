import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, GripVertical, Loader2, Plus, Trash2, Wrench } from "lucide-react";
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
import { HelpTip } from "@/components/page-help";
import { ADMIN_MENU } from "@/pages/panels/admin/menu";
import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import { formatMoney } from "@/lib/br-masks";
import { useServicos } from "@/hooks/use-servicos";
import {
  useComposicaoDosServicos,
  useGrupoServico,
  useGrupoServicoItens,
  useSalvarGrupoServico,
  type GrupoServicoStatus,
} from "@/hooks/use-grupos-servicos";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/searchable-select";


/** Linha arrastável de um serviço do agrupamento. */
function LinhaServico({
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
      className={`flex flex-wrap items-center gap-3 bg-card px-3 py-2.5 ${
        isDragging ? "relative z-10 rounded-lg shadow-lg ring-1 ring-primary/40" : ""
      }`}
    >
      {children({ setActivatorNodeRef, listeners, attributes })}
    </li>
  );
}

/** Tela completa de cadastro e edição de um agrupamento de serviços. */
export default function GrupoServicoForm() {
  const { id } = useParams<{ id: string }>();
  const editando = Boolean(id);
  const navigate = useNavigate();

  usePageMeta(
    editando
      ? "Editar agrupamento — JH7 Gestão Fotográfica"
      : "Novo agrupamento — JH7 Gestão Fotográfica",
    "Junte vários serviços em um agrupamento e defina a ordem deles.",
  );

  const { data: grupo, isLoading: carregandoGrupo } = useGrupoServico(id);
  const { data: itensSalvos, isLoading: carregandoItens } = useGrupoServicoItens(id);
  const { data: composicao } = useComposicaoDosServicos();

  const { data: servicos } = useServicos();
  const salvar = useSalvarGrupoServico();

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<GrupoServicoStatus>("ATIVO");
  const [itens, setItens] = useState<string[]>([]);
  const [servicoEscolhido, setServicoEscolhido] = useState("");
  const [erros, setErros] = useState<{ nome?: string }>({});
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (!editando || carregado) return;
    if (!grupo || carregandoItens) return;
    setNome(grupo.nome);
    setDescricao(grupo.descricao ?? "");
    setStatus(grupo.status);
    setItens((itensSalvos ?? []).map((i) => i.servico_id));
    setCarregado(true);
  }, [editando, carregado, grupo, itensSalvos, carregandoItens]);

  const servicoPorId = useMemo(() => {
    const mapa = new Map<string, { nome: string; status: string; valor_venda: number | null }>();
    (servicos ?? []).forEach((s) =>
      mapa.set(s.id, { nome: s.nome, status: s.status, valor_venda: s.valor_venda }),
    );
    return mapa;
  }, [servicos]);

  const disponiveis = useMemo(
    () =>
      (servicos ?? []).filter((s) => s.status === "ATIVO" && !itens.includes(s.id)),
    [servicos, itens],
  );

  const somaVenda = itens.reduce(
    (soma, servicoId) => soma + (servicoPorId.get(servicoId)?.valor_venda ?? 0),
    0,
  );
  const algumSemValor = itens.some((sid) => servicoPorId.get(sid)?.valor_venda == null);

  function adicionarServico() {
    if (!servicoEscolhido) {
      notifyValidation("Escolha um serviço para incluir no agrupamento.");
      return;
    }
    setItens((atuais) => [...atuais, servicoEscolhido]);
    setServicoEscolhido("");
  }

  function removerItem(servicoId: string) {
    setItens((atuais) => atuais.filter((s) => s !== servicoId));
  }

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function aoSoltar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;
    setItens((atuais) => {
      const de = atuais.indexOf(String(active.id));
      const para = atuais.indexOf(String(over.id));
      if (de < 0 || para < 0) return atuais;
      return arrayMove(atuais, de, para);
    });
  }

  function validar() {
    const novos: typeof erros = {};
    if (nome.trim().length < 2)
      novos.nome = "Informe o nome do agrupamento (mínimo 2 caracteres).";
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function submeter() {
    if (!validar()) {
      notifyValidation("Revise os campos destacados para continuar.");
      return;
    }
    try {
      await salvar.mutateAsync({
        id,
        dados: {
          nome: nome.trim(),
          descricao: descricao.trim() ? descricao.trim() : null,
          status,
          servicos: itens,
        },
      });
      notifySuccess(editando ? "Agrupamento atualizado." : "Agrupamento cadastrado com sucesso.");
      navigate("/admin/agrupamento-servicos");
    } catch (err) {
      notifyError(err, { title: "Não foi possível salvar o agrupamento" });
    }
  }

  const carregando = editando && (carregandoGrupo || carregandoItens);

  return (
    <PanelLayout accent="admin" menu={ADMIN_MENU}>
      <div className="mx-auto w-full max-w-[var(--app-max-w)] space-y-[clamp(1.5rem,4vw,2rem)]">
        <header className="space-y-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 px-2"
            onClick={() => navigate("/admin/agrupamento-servicos")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a lista de agrupamentos
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">
                {editando ? "Editar agrupamento" : "Novo agrupamento"}
              </h1>
              <HelpTip text="Dê um nome ao agrupamento (ex.: “Pacote Casamento Completo”), inclua os serviços que fazem parte dele e arraste pela alça (⠿) para definir a ordem em que aparecem. Os campos marcados com * são obrigatórios. Só aparecem na lista os serviços ativos que ainda não foram incluídos." />
            </div>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
              Escolha os serviços do agrupamento e organize a ordem deles.
            </p>
          </div>
        </header>

        {carregando ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando agrupamento…
          </div>
        ) : (
          <div className="space-y-6">
            {/* Dados básicos */}
            <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Dados do agrupamento
              </h2>

              <div className="space-y-1.5">
                <Label htmlFor="grupo-nome" className="flex items-center gap-1.5">
                  Nome do agrupamento <span className="text-destructive">*</span>
                  <HelpTip text="Como o agrupamento aparece nas listas e propostas. Ex.: Pacote Casamento, Combo Newborn." />
                </Label>
                <Input
                  id="grupo-nome"
                  value={nome}
                  maxLength={120}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Pacote Casamento Completo"
                />
                {erros.nome ? <p className="text-xs text-destructive">{erros.nome}</p> : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grupo-descricao" className="flex items-center gap-1.5">
                  Descrição <span className="text-xs text-muted-foreground">(opcional)</span>
                  <HelpTip text="Uma explicação curta do que este agrupamento inclui. Ajuda a equipe a entender o pacote na hora da venda." />
                </Label>
                <Textarea
                  id="grupo-descricao"
                  value={descricao}
                  maxLength={300}
                  rows={3}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Deixe em branco se não precisar"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  Status <span className="text-destructive">*</span>
                  <HelpTip text="Ativo: o agrupamento está disponível para uso. Inativo: continua no histórico, mas não deve mais ser oferecido." />
                </Label>
                <div className="flex gap-2">
                  {([
                    ["ATIVO", "Ativo"],
                    ["INATIVO", "Inativo"],
                  ] as [GrupoServicoStatus, string][]).map(([valor, rotulo]) => (
                    <Button
                      key={valor}
                      type="button"
                      variant={status === valor ? "default" : "outline"}
                      onClick={() => setStatus(valor)}
                    >
                      {rotulo}
                    </Button>
                  ))}
                </div>
              </div>
            </section>

            {/* Serviços do agrupamento */}
            <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Serviços do agrupamento
                </h2>
                <HelpTip text="Inclua aqui os serviços que fazem parte deste agrupamento. Abaixo do nome de cada serviço aparecem os produtos que o compõem, com a quantidade usada — assim você confere tudo o que o pacote entrega. Arraste pelo ícone de alça (⠿) para mudar a ordem em que eles aparecem. A soma dos valores de venda é calculada automaticamente (serviços sem valor informado entram como zero)." />
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-1.5">
                  <Label className="text-sm">Serviço</Label>
                  <SearchableSelect
                    value={servicoEscolhido}
                    onChange={setServicoEscolhido}
                    ariaLabel="Escolher serviço"
                    placeholder={
                      disponiveis.length === 0
                        ? "Nenhum serviço ativo disponível para incluir"
                        : "Escolha um serviço"
                    }
                    placeholderBusca="Pesquisar serviço pelo nome…"
                    vazio="Nenhum serviço encontrado com esse nome."
                    disabled={disponiveis.length === 0}
                    opcoes={disponiveis.map((s) => ({
                      value: s.id,
                      label: s.nome,
                      descricao:
                        s.valor_venda != null
                          ? `— R$ ${formatMoney(s.valor_venda)}`
                          : "— venda não informada",
                    }))}
                  />
                </div>

                <Button type="button" variant="outline" className="gap-2" onClick={adicionarServico}>
                  <Plus className="h-4 w-4" />
                  Incluir
                </Button>
              </div>

              {itens.length === 0 ? (
                <div className="space-y-2 rounded-lg border border-dashed border-border p-6 text-center">
                  <Wrench className="mx-auto h-7 w-7 text-muted-foreground" />
                  <p className="text-sm font-medium">Nenhum serviço no agrupamento.</p>
                  <p className="text-sm text-muted-foreground">
                    Escolha um serviço acima e clique em “Incluir”. Você também pode salvar o
                    agrupamento vazio e completar depois.
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={sensores}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                  onDragEnd={aoSoltar}
                >
                  <SortableContext items={itens} strategy={verticalListSortingStrategy}>
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {itens.map((servicoId, indice) => {
                        const s = servicoPorId.get(servicoId);
                        const produtosDoServico = composicao?.[servicoId] ?? [];
                        return (
                          <LinhaServico key={servicoId} id={servicoId}>
                            {({ setActivatorNodeRef, listeners, attributes }) => (
                              <>
                                <button
                                  type="button"
                                  ref={setActivatorNodeRef}
                                  {...attributes}
                                  {...listeners}
                                  className="cursor-grab touch-none rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
                                  aria-label={`Arrastar ${s?.nome ?? "serviço"} para reordenar`}
                                  title="Arraste para mudar a ordem"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </button>
                                <span className="w-6 shrink-0 text-xs font-semibold text-muted-foreground">
                                  {indice + 1}º
                                </span>
                                <div className="min-w-[10rem] flex-1 space-y-1.5">
                                  <p className="text-sm font-medium text-foreground">
                                    {s?.nome ?? "Serviço removido"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Venda:{" "}
                                    {s?.valor_venda == null
                                      ? "não informado"
                                      : `R$ ${formatMoney(s.valor_venda)}`}
                                    {s && s.status !== "ATIVO" ? " · serviço inativo" : ""}
                                  </p>
                                  <div className="rounded-md bg-muted/40 px-2.5 py-1.5">
                                    <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                                      Produtos deste serviço
                                    </p>
                                    {produtosDoServico.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">
                                        Este serviço não usa produtos.
                                      </p>
                                    ) : (
                                      <ul className="mt-0.5 space-y-0.5">
                                        {produtosDoServico.map((p, i) => (
                                          <li
                                            key={`${servicoId}-${p.nome}-${i}`}
                                            className="text-xs text-foreground/80"
                                          >
                                            • {p.nome}{" "}
                                            <span className="text-muted-foreground">
                                              ({p.quantidade}x)
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  aria-label={`Remover ${s?.nome ?? "serviço"} do agrupamento`}
                                  onClick={() => removerItem(servicoId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </LinhaServico>
                        );
                      })}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}

              {itens.length > 0 ? (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <span className="text-muted-foreground">Soma dos valores de venda: </span>
                  <span className="font-semibold">R$ {formatMoney(somaVenda)}</span>
                  {algumSemValor ? (
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      (alguns serviços estão sem valor de venda informado)
                    </span>
                  ) : null}
                </div>
              ) : null}
            </section>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/agrupamento-servicos")}
              >
                Cancelar
              </Button>
              <Button type="button" className="gap-2" onClick={submeter} disabled={salvar.isPending}>
                {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editando ? "Salvar alterações" : "Cadastrar agrupamento"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PanelLayout>
  );
}
