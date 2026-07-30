import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  FileText,
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
import {
  notifyError,
  notifySuccess,
  notifyValidation,
  rawErrorMessage,
} from "@/lib/system-message";

import {
  ORCAMENTO_STATUS,
  rotuloStatus,
  useDeleteOrcamento,
  useOrcamentos,
  useSetOrcamentoStatus,
  type Orcamento,
  type OrcamentoStatus,
} from "@/hooks/use-orcamentos";

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

type Filtro = "todos" | OrcamentoStatus;

function formatarData(valor: string | null) {
  if (!valor) return "sem validade";
  const [ano, mes, dia] = valor.split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function corStatus(status: OrcamentoStatus) {
  switch (status) {
    case "RASCUNHO":
      return {
        cor: "text-muted-foreground",
        bg: "bg-muted/50",
        borda: "border-border",
      };
    case "ENVIADO":
      return {
        cor: "text-blue-600",
        bg: "bg-blue-500/10",
        borda: "border-blue-500/30",
      };
    case "APROVADO":
      return {
        cor: "text-green-600",
        bg: "bg-green-500/10",
        borda: "border-green-500/30",
      };
    case "RECUSADO":
      return {
        cor: "text-destructive",
        bg: "bg-destructive/10",
        borda: "border-destructive/30",
      };
    case "CANCELADO":
      return {
        cor: "text-amber-600",
        bg: "bg-amber-500/10",
        borda: "border-amber-500/30",
      };
  }
}

function StatusBadge({ status, vencido }: { status: OrcamentoStatus; vencido: boolean }) {
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
        {rotuloStatus(status)}
      </span>
      {vencido ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
          <CalendarClock className="h-3 w-3" />
          Validade vencida
        </span>
      ) : null}
    </span>
  );
}

/** Módulo Orçamentos do painel do administrador da empresa. */
export default function Orcamentos() {
  usePageMeta(
    "Orçamentos — JH7 Gestão de Estúdios Fotográficos",
    "Monte e acompanhe os orçamentos enviados para clientes e leads.",
  );

  const navigate = useNavigate();
  const { data: orcamentos, isLoading, error } = useOrcamentos();
  const remover = useDeleteOrcamento();
  const mudarStatus = useSetOrcamentoStatus();

  const detalheErro = error ? rawErrorMessage(error) : "";
  const tabelaAusente = /does not exist|schema cache|relation|not find the table|404/i.test(
    detalheErro,
  );

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [alvoExclusao, setAlvoExclusao] = useState<Orcamento | null>(null);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (orcamentos ?? []).filter((o) => {
      if (filtro !== "todos" && o.status !== filtro) return false;
      if (!termo) return true;
      return (
        o.descricao.toLowerCase().includes(termo) || o.cliente_nome.toLowerCase().includes(termo)
      );
    });
  }, [orcamentos, busca, filtro]);

  const totais = useMemo(() => {
    const todos = orcamentos ?? [];
    const contagemPorStatus = Object.fromEntries(
      ORCAMENTO_STATUS.map((s) => [s.valor, todos.filter((o) => o.status === s.valor).length]),
    ) as Record<OrcamentoStatus, number>;
    return {
      total: todos.length,
      abertos: todos.filter((o) => o.status === "RASCUNHO" || o.status === "ENVIADO").length,
      aprovados: todos.filter((o) => o.status === "APROVADO").length,
      vencidos: todos.filter((o) => o.vencido).length,
      contagemPorStatus,
    };
  }, [orcamentos]);

  async function alterarSituacao(o: Orcamento, status: OrcamentoStatus) {
    if (o.status === status) return;
    // Regra única (src/lib/clientes.ts): só bloqueia enquanto for lead em aberto.
    if (o.cliente_lead_aberto) {
      notifyValidation(
        "Este orçamento é de um lead. Converta o lead em cliente para poder mudar a situação da proposta.",
      );
      return;
    }

    try {
      await mudarStatus.mutateAsync({ id: o.id, status });
      notifySuccess(`Situação alterada para “${rotuloStatus(status)}”.`);
    } catch (err) {
      notifyError(err, { title: "Não foi possível alterar a situação" });
    }
  }


  async function confirmarExclusao() {
    if (!alvoExclusao) return;
    try {
      await remover.mutateAsync(alvoExclusao.id);
      notifySuccess("Orçamento excluído.");
    } catch (err) {
      notifyError(err, { title: "Não foi possível excluir o orçamento" });
    } finally {
      setAlvoExclusao(null);
    }
  }

  return (
    <PanelLayout accent="admin" menu={ADMIN_MENU}>
      <div className="mx-auto w-full max-w-[var(--app-max-w)] space-y-[clamp(1.5rem,4vw,2rem)]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">Orçamentos</h1>
              <HelpTip text="Um orçamento é a proposta que você envia para um cliente ou lead. Clique em “Novo orçamento” para informar a descrição, os serviços, quantos descontos e acréscimos precisar, a observação geral, a data e até quando a proposta vale. Aqui na lista aparece o valor final (já com desconto ou acréscimo). Importante: propostas de leads ficam com a situação bloqueada — só é possível mudar a situação depois que o lead virar cliente. Use os filtros para ver só os que estão aguardando resposta, os aprovados ou os recusados. Quando a data de validade passa, o orçamento aparece marcado como “Validade vencida”. Esta tela se atualiza sozinha quando alguém da sua equipe altera algo." />
            </div>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
              Acompanhe as propostas enviadas para clientes e leads.
            </p>
          </div>
          <Button className="tap-target gap-2" onClick={() => navigate("/admin/orcamentos/novo")}>
            <Plus className="h-4 w-4" />
            Novo orçamento
          </Button>
        </header>

        <div className="grid gap-3 sm:grid-cols-4">
          {[
            {
              rotulo: "Total de orçamentos",
              valor: totais.total,
              ajuda: "Todas as propostas cadastradas na sua empresa.",
            },
            {
              rotulo: "Aguardando resposta",
              valor: totais.abertos,
              ajuda: "Orçamentos em rascunho ou já enviados que ainda não tiveram retorno.",
            },
            {
              rotulo: "Aprovados",
              valor: totais.aprovados,
              ajuda: "Propostas que o cliente aceitou.",
            },
            {
              rotulo: "Validade vencida",
              valor: totais.vencidos,
              ajuda: "Propostas em aberto cuja data de validade já passou. Vale a pena renegociar.",
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
              placeholder="Buscar por descrição ou nome do cliente"
              className="pl-9"
              aria-label="Buscar orçamento por descrição ou nome do cliente"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["todos", "Todos", totais.total] as [Filtro, string, number],
            ] as [Filtro, string, number][]).concat(
              ORCAMENTO_STATUS.map(
                (s) => [s.valor, s.rotulo, totais.contagemPorStatus[s.valor]] as [Filtro, string, number],
              ),
            ).map(([valor, rotulo, contagem]) => (
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
                  ? "O módulo de Orçamentos ainda não foi instalado no banco de dados"
                  : "Não foi possível carregar os orçamentos"}
              </p>
              <p className="text-sm text-muted-foreground">
                {tabelaAusente
                  ? "Peça para o responsável técnico rodar os arquivos sql/44_orcamentos.sql, sql/45_orcamento_itens.sql, sql/46_orcamento_ajuste_observacoes.sql e sql/47_orcamento_ajustes.sql no banco de dados e recarregue esta página."
                  : "Verifique sua conexão e tente novamente em instantes."}
              </p>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando orçamentos…
            </div>
          ) : lista.length === 0 ? (
            <div className="space-y-3 p-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                {(orcamentos ?? []).length === 0
                  ? "Nenhum orçamento cadastrado ainda."
                  : "Nenhum orçamento encontrado com esses filtros."}
              </p>
              <p className="text-sm text-muted-foreground">
                {(orcamentos ?? []).length === 0
                  ? "Clique em “Novo orçamento” para registrar a primeira proposta."
                  : "Limpe a busca ou escolha o filtro “Todos” para ver a lista completa."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {lista.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-[12rem] flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{o.descricao}</span>
                      <StatusBadge status={o.status} vencido={o.vencido} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {o.cliente_nome}
                      {o.cliente_origem === "LEAD" ? " (lead)" : ""}
                      {" · "}
                      Data: {formatarData(o.data_orcamento)}
                      {" · "}
                      Validade: {formatarData(o.validade)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Valor final:{" "}
                      <strong className="text-foreground">
                        {o.total_final == null
                          ? "sem valores informados"
                          : `R$ ${o.total_final.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`}
                      </strong>
                      {o.ajustes.length > 0
                        ? ` · ${o.ajustes
                            .map(
                              (a) =>
                                `${a.tipo === "DESCONTO" ? "Desconto" : "Acréscimo"} de R$ ${a.valor.toLocaleString(
                                  "pt-BR",
                                  { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                                )}${a.descricao ? ` (${a.descricao})` : ""}`,
                            )
                            .join(" · ")}`
                        : ""}
                    </p>
                    {o.observacoes ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        Observação: {o.observacoes}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1">
                    {o.cliente_origem === "LEAD" ? (
                      <div className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground">
                        Situação bloqueada
                        <HelpTip text="Este orçamento pertence a um lead. A situação só pode ser alterada depois que o lead virar cliente." />
                      </div>
                    ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          aria-label={`Alterar situação de ${o.descricao}`}
                          disabled={mudarStatus.isPending}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Situação
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>Mudar situação do orçamento</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {ORCAMENTO_STATUS.map((s) => (
                          <DropdownMenuItem
                            key={s.valor}
                            disabled={o.status === s.valor}
                            onSelect={() => alterarSituacao(o, s.valor)}
                            className="flex flex-col items-start gap-0.5"
                          >
                            <span className="text-sm font-medium">
                              {s.rotulo}
                              {o.status === s.valor ? " (atual)" : ""}
                            </span>
                            <span className="text-xs text-muted-foreground">{s.ajuda}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    )}

                    <IconAction
                      label="Editar orçamento"
                      ariaLabel={`Editar ${o.descricao}`}
                      onClick={() => navigate(`/admin/orcamentos/${o.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </IconAction>
                    <IconAction
                      label="Excluir orçamento"
                      ariaLabel={`Excluir ${o.descricao}`}
                      className="text-destructive hover:text-destructive"
                      onClick={() => setAlvoExclusao(o)}
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
        onOpenChange={(v) => (v ? null : setAlvoExclusao(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O orçamento “{alvoExclusao?.descricao}” será removido definitivamente. O cliente ou
              lead continua cadastrado normalmente. Se quiser manter o histórico, mude a situação
              para “Cancelado” em vez de excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmarExclusao}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelLayout>
  );
}
