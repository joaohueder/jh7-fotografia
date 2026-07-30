import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  FileSignature,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { cn } from "@/lib/utils";
import { PanelLayout } from "@/components/panel-layout";
import { IconAction } from "@/components/icon-action";
import { HelpTip } from "@/components/page-help";
import { ADMIN_MENU } from "@/pages/panels/admin/menu";
import { notifyError, notifySuccess, rawErrorMessage } from "@/lib/system-message";

import {
  CONTRATO_STATUS,
  contratoTemDadosCriticos,
  rotuloContratoStatus,
  useContratos,
  useDeleteContrato,
  useSetContratoStatus,
  type Contrato,
  type ContratoStatus,
} from "@/hooks/use-contratos";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Filtro = "todos" | ContratoStatus;

function formatarData(valor: string | null) {
  if (!valor) return "não informada";
  const [ano, mes, dia] = valor.split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function moeda(valor: number | null) {
  if (valor == null) return "sem valores informados";
  return `R$ ${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function corStatus(status: ContratoStatus) {
  switch (status) {
    case "RASCUNHO":
      return { cor: "text-muted-foreground", bg: "bg-muted/50", borda: "border-border" };
    case "ASSINADO":
      return { cor: "text-blue-600", bg: "bg-blue-500/10", borda: "border-blue-500/30" };
    case "VIGENTE":
      return { cor: "text-green-600", bg: "bg-green-500/10", borda: "border-green-500/30" };
    case "CONCLUIDO":
      return { cor: "text-emerald-700", bg: "bg-emerald-500/10", borda: "border-emerald-500/30" };
    case "CANCELADO":
      return { cor: "text-destructive", bg: "bg-destructive/10", borda: "border-destructive/30" };
  }
}

function StatusBadge({ status, vencido }: { status: ContratoStatus; vencido: boolean }) {
  const estilo = corStatus(status);
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
          estilo.cor,
          estilo.bg,
          estilo.borda,
        )}
      >
        {rotuloContratoStatus(status)}
      </span>
      {vencido ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
          <CalendarClock className="h-3 w-3" />
          Vigência encerrada
        </span>
      ) : null}
    </span>
  );
}

/** Módulo Contratos do painel do administrador da empresa. */
export default function Contratos() {
  usePageMeta(
    "Contratos — JH7 Gestão de Estúdios Fotográficos",
    "Gere contratos a partir de orçamentos aprovados e acompanhe a vigência de cada um.",
  );

  const navigate = useNavigate();
  const { data: contratos, isLoading, error } = useContratos();
  const remover = useDeleteContrato();
  const mudarStatus = useSetContratoStatus();

  const detalheErro = error ? rawErrorMessage(error) : "";
  const tabelaAusente = /does not exist|schema cache|relation|not find the table|404/i.test(
    detalheErro,
  );

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [alvoExclusao, setAlvoExclusao] = useState<Contrato | null>(null);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (contratos ?? []).filter((c) => {
      if (filtro !== "todos" && c.status !== filtro) return false;
      if (!termo) return true;
      return (
        c.titulo.toLowerCase().includes(termo) || c.cliente_nome.toLowerCase().includes(termo)
      );
    });
  }, [contratos, busca, filtro]);

  const totais = useMemo(() => {
    const todos = contratos ?? [];
    const contagemPorStatus = Object.fromEntries(
      CONTRATO_STATUS.map((s) => [s.valor, todos.filter((c) => c.status === s.valor).length]),
    ) as Record<ContratoStatus, number>;
    return {
      total: todos.length,
      emAndamento: todos.filter((c) => c.status === "ASSINADO" || c.status === "VIGENTE").length,
      concluidos: todos.filter((c) => c.status === "CONCLUIDO").length,
      vencidos: todos.filter((c) => c.vencido).length,
      contagemPorStatus,
    };
  }, [contratos]);

  async function alterarSituacao(c: Contrato, status: ContratoStatus) {
    if (c.status === status) return;
    try {
      await mudarStatus.mutateAsync({ id: c.id, status });
      notifySuccess(`Situação alterada para “${rotuloContratoStatus(status)}”.`);
    } catch (err) {
      notifyError(err, { title: "Não foi possível alterar a situação" });
    }
  }

  async function confirmarExclusao() {
    if (!alvoExclusao) return;
    try {
      await remover.mutateAsync(alvoExclusao.id);
      notifySuccess("Contrato excluído.");
    } catch (err) {
      notifyError(err, { title: "Não foi possível excluir o contrato" });
    } finally {
      setAlvoExclusao(null);
    }
  }

  const bloqueado = alvoExclusao ? contratoTemDadosCriticos(alvoExclusao.status) : false;

  return (
    <PanelLayout accent="admin" menu={ADMIN_MENU}>
      <div className="mx-auto w-full max-w-[var(--app-max-w)] space-y-[clamp(1.5rem,4vw,2rem)]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">Contratos</h1>
              <HelpTip text="O contrato é o compromisso firmado com um cliente já cadastrado. Você pode criar um contrato do zero ou gerar a partir de um orçamento aprovado — nesse caso os serviços e produtos da proposta são copiados para o contrato e ficam guardados como estavam no dia da assinatura. Use os botões de filtro para ver quantos contratos existem em cada situação. Quando a data de fim da vigência passa e o contrato ainda está aberto, ele aparece marcado como “Vigência encerrada”. Contratos que já saíram de Rascunho não podem ser excluídos: nesses casos, use a situação “Cancelado” para preservar o histórico. Esta tela se atualiza sozinha quando alguém da equipe altera algo." />
            </div>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
              Gere contratos a partir de orçamentos aprovados e acompanhe a vigência de cada um.
            </p>
          </div>
          <Button className="tap-target gap-2" onClick={() => navigate("/admin/contratos/novo")}>
            <Plus className="h-4 w-4" />
            Novo contrato
          </Button>
        </header>

        <div className="grid gap-3 sm:grid-cols-4">
          {[
            {
              rotulo: "Total de contratos",
              valor: totais.total,
              ajuda: "Todos os contratos cadastrados na sua empresa.",
            },
            {
              rotulo: "Em andamento",
              valor: totais.emAndamento,
              ajuda: "Contratos assinados ou já vigentes, com serviços a executar.",
            },
            {
              rotulo: "Concluídos",
              valor: totais.concluidos,
              ajuda: "Contratos cujos serviços já foram entregues.",
            },
            {
              rotulo: "Vigência encerrada",
              valor: totais.vencidos,
              ajuda: "Contratos abertos cuja data de fim da vigência já passou. Vale revisar.",
            },
          ].map((card) => (
            <div key={card.rotulo} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {card.rotulo}
                <HelpTip text={card.ajuda} />
              </div>
              <p className="mt-1 text-2xl font-bold">{card.valor}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título ou nome do cliente"
              className="pl-9"
              aria-label="Buscar contrato por título ou nome do cliente"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [["todos", "Todos", totais.total]] as [Filtro, string, number][]
            )
              .concat(
                CONTRATO_STATUS.map(
                  (s) =>
                    [s.valor, s.rotulo, totais.contagemPorStatus[s.valor]] as [
                      Filtro,
                      string,
                      number,
                    ],
                ),
              )
              .map(([valor, rotulo, contagem]) => (
                <Button
                  key={valor}
                  type="button"
                  size="sm"
                  variant={filtro === valor ? "default" : "outline"}
                  onClick={() => setFiltro(valor)}
                  className="gap-1.5"
                >
                  {rotulo}
                  <span
                    className={cn(
                      "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                      filtro === valor
                        ? "bg-primary-foreground text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {contagem}
                  </span>
                </Button>
              ))}
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-destructive">
                {tabelaAusente
                  ? "O módulo de Contratos ainda não foi instalado no banco de dados"
                  : "Não foi possível carregar os contratos"}
              </p>
              <p className="text-sm text-muted-foreground">
                {tabelaAusente
                  ? "Peça para o responsável técnico rodar o arquivo sql/48_contratos.sql no banco de dados e recarregue esta página."
                  : "Verifique sua conexão e tente novamente em instantes."}
              </p>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando contratos…
            </div>
          ) : lista.length === 0 ? (
            <div className="space-y-3 p-10 text-center">
              <FileSignature className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                {(contratos ?? []).length === 0
                  ? "Nenhum contrato cadastrado ainda."
                  : "Nenhum contrato encontrado com esses filtros."}
              </p>
              <p className="text-sm text-muted-foreground">
                {(contratos ?? []).length === 0
                  ? "Clique em “Novo contrato” para gerar o primeiro, a partir de um orçamento aprovado ou do zero."
                  : "Limpe a busca ou escolha o filtro “Todos” para ver a lista completa."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {lista.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-[12rem] flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{c.titulo}</span>
                      <StatusBadge status={c.status} vencido={c.vencido} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.cliente_nome}
                      {" · "}
                      Data: {formatarData(c.data_contrato)}
                      {" · "}
                      Vigência: {formatarData(c.inicio_vigencia)} até{" "}
                      {formatarData(c.fim_vigencia)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Valor do contrato:{" "}
                      <strong className="text-foreground">{moeda(c.total_valor)}</strong>
                      {" · "}
                      {c.total_itens} serviço{c.total_itens === 1 ? "" : "s"}
                      {c.orcamento_descricao
                        ? ` · Gerado do orçamento “${c.orcamento_descricao}”`
                        : " · Criado direto no módulo de contratos"}
                    </p>
                    {c.observacoes ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        Observação: {c.observacoes}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          aria-label={`Alterar situação de ${c.titulo}`}
                          disabled={mudarStatus.isPending}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Situação
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>Mudar situação do contrato</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {CONTRATO_STATUS.map((s) => (
                          <DropdownMenuItem
                            key={s.valor}
                            disabled={c.status === s.valor}
                            onSelect={() => alterarSituacao(c, s.valor)}
                            className="flex flex-col items-start gap-0.5"
                          >
                            <span className="text-sm font-medium">
                              {s.rotulo}
                              {c.status === s.valor ? " (atual)" : ""}
                            </span>
                            <span className="text-xs text-muted-foreground">{s.ajuda}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <IconAction
                      label={
                        c.status === "RASCUNHO" ? "Editar contrato" : "Visualizar contrato"
                      }
                      ariaLabel={`Abrir ${c.titulo}`}
                      onClick={() =>
                        navigate(
                          c.status === "RASCUNHO"
                            ? `/admin/contratos/${c.id}`
                            : `/admin/contratos/${c.id}?modo=ver`,
                        )
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </IconAction>
                    <IconAction
                      label="Excluir contrato"
                      ariaLabel={`Excluir ${c.titulo}`}
                      className="text-destructive hover:text-destructive"
                      onClick={() => setAlvoExclusao(c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconAction>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AlertDialog
        open={Boolean(alvoExclusao)}
        onOpenChange={(aberto) => {
          if (!aberto) setAlvoExclusao(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bloqueado ? "Este contrato não pode ser excluído" : "Excluir este contrato?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Contrato: <strong>{alvoExclusao?.titulo}</strong> — cliente{" "}
                  {alvoExclusao?.cliente_nome}.
                </p>
                {bloqueado ? (
                  <p>
                    Ele já saiu da situação “Rascunho”, ou seja, existe um compromisso registrado
                    com o cliente. Para encerrar sem perder o histórico, mude a situação para
                    “Cancelado” na lista.
                  </p>
                ) : (
                  <p>
                    Serão apagados também os {alvoExclusao?.total_itens ?? 0} serviço(s) copiados
                    para dentro deste contrato. O orçamento de origem e o cadastro do cliente não
                    são afetados. Esta ação não pode ser desfeita.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            {bloqueado ? null : (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void confirmarExclusao();
                }}
              >
                Excluir contrato
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelLayout>
  );
}
