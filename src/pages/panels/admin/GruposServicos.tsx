import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Layers, Loader2, Pencil, Plus, Power, Search, Trash2 } from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { IconAction } from "@/components/icon-action";
import { HelpTip } from "@/components/page-help";
import { ADMIN_MENU } from "@/pages/panels/admin/menu";
import { notifyError, notifySuccess, rawErrorMessage } from "@/lib/system-message";
import { formatMoney } from "@/lib/br-masks";
import {
  useDeleteGrupoServico,
  useGruposServicos,
  useSetGrupoServicoStatus,
  type GrupoServico,
  type GrupoServicoStatus,
} from "@/hooks/use-grupos-servicos";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type Filtro = "todos" | "ativos" | "inativos";

function StatusBadge({ status }: { status: GrupoServicoStatus }) {
  const ativo = status === "ATIVO";
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
      style={{
        borderColor: ativo ? "var(--panel-accent)" : "hsl(var(--border))",
        color: ativo ? "var(--panel-accent)" : "hsl(var(--muted-foreground))",
        background: ativo ? "color-mix(in oklab, var(--panel-accent) 12%, transparent)" : undefined,
      }}
    >
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

/** Módulo Agrupamento de Serviços do painel do administrador da empresa. */
export default function GruposServicos() {
  usePageMeta(
    "Agrupamento de serviços — JH7 Gestão Fotográfica",
    "Junte vários serviços em um agrupamento (pacote) e defina a ordem deles.",
  );

  const navigate = useNavigate();
  const { data: grupos, isLoading, error } = useGruposServicos();

  const detalheErro = error ? rawErrorMessage(error) : "";
  const tabelaAusente = /does not exist|schema cache|relation|not find the table|404/i.test(
    detalheErro,
  );
  const permissaoDesatualizada =
    /não está vinculado a uma empresa|P0001|permission denied/i.test(detalheErro);

  const setStatus = useSetGrupoServicoStatus();
  const remover = useDeleteGrupoServico();

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [alvoStatus, setAlvoStatus] = useState<GrupoServico | null>(null);
  const [alvoExclusao, setAlvoExclusao] = useState<GrupoServico | null>(null);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (grupos ?? []).filter((g) => {
      if (filtro === "ativos" && g.status !== "ATIVO") return false;
      if (filtro === "inativos" && g.status !== "INATIVO") return false;
      if (!termo) return true;
      return g.nome.toLowerCase().includes(termo);
    });
  }, [grupos, busca, filtro]);

  const totais = useMemo(() => {
    const todos = grupos ?? [];
    return {
      total: todos.length,
      ativos: todos.filter((g) => g.status === "ATIVO").length,
      inativos: todos.filter((g) => g.status === "INATIVO").length,
    };
  }, [grupos]);

  async function confirmarStatus() {
    if (!alvoStatus) return;
    try {
      await setStatus.mutateAsync({
        id: alvoStatus.id,
        status: alvoStatus.status === "ATIVO" ? "INATIVO" : "ATIVO",
      });
      notifySuccess(
        alvoStatus.status === "ATIVO" ? "Agrupamento inativado." : "Agrupamento ativado.",
      );
    } catch (err) {
      notifyError(err, { title: "Não foi possível alterar o status" });
    } finally {
      setAlvoStatus(null);
    }
  }

  async function confirmarExclusao() {
    if (!alvoExclusao) return;
    try {
      await remover.mutateAsync(alvoExclusao.id);
      notifySuccess("Agrupamento excluído.");
    } catch (err) {
      notifyError(err, { title: "Não foi possível excluir o agrupamento" });
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
              <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">
                Agrupamento de serviços
              </h1>
              <HelpTip text="Um agrupamento junta vários serviços em um só conjunto (por exemplo: “Pacote Casamento” com cobertura, edição e álbum). Clique em “Novo agrupamento” para criar, escolher os serviços e arrastar pela alça (⠿) para definir a ordem em que eles aparecem. Use os botões de cada linha para editar, ativar/inativar ou excluir. Esta tela se atualiza sozinha quando alguém da sua equipe altera algo." />
            </div>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
              Junte vários serviços em um agrupamento e organize a ordem deles.
            </p>
          </div>
          <Button
            className="tap-target gap-2"
            onClick={() => navigate("/admin/agrupamento-servicos/novo")}
          >
            <Plus className="h-4 w-4" />
            Novo agrupamento
          </Button>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              rotulo: "Total de agrupamentos",
              valor: totais.total,
              ajuda: "Todos os agrupamentos cadastrados na sua empresa.",
            },
            {
              rotulo: "Ativos",
              valor: totais.ativos,
              ajuda: "Agrupamentos disponíveis para uso nas vendas e propostas.",
            },
            {
              rotulo: "Inativos",
              valor: totais.inativos,
              ajuda: "Agrupamentos que não estão mais em uso, mas continuam no histórico.",
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
              placeholder="Buscar agrupamento pelo nome"
              className="pl-9"
              aria-label="Buscar agrupamento pelo nome"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["todos", "Todos"],
              ["ativos", "Ativos"],
              ["inativos", "Inativos"],
            ] as [Filtro, string][]).map(([valor, rotulo]) => (
              <Button
                key={valor}
                type="button"
                size="sm"
                variant={filtro === valor ? "default" : "outline"}
                onClick={() => setFiltro(valor)}
              >
                {rotulo}
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
                  ? "O módulo de Agrupamento de serviços ainda não foi instalado no banco de dados"
                  : permissaoDesatualizada
                    ? "Seu acesso a este módulo precisa ser atualizado"
                    : "Não foi possível carregar os agrupamentos"}
              </p>
              <p className="text-sm text-muted-foreground">
                {tabelaAusente
                  ? "Peça para o responsável técnico rodar o arquivo sql/43_grupos_servicos.sql no banco de dados e recarregue esta página."
                  : "Verifique sua conexão e tente novamente em instantes."}
              </p>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando agrupamentos…
            </div>
          ) : lista.length === 0 ? (
            <div className="space-y-3 p-10 text-center">
              <Layers className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                {(grupos ?? []).length === 0
                  ? "Nenhum agrupamento cadastrado ainda."
                  : "Nenhum agrupamento encontrado com esses filtros."}
              </p>
              <p className="text-sm text-muted-foreground">
                {(grupos ?? []).length === 0
                  ? "Clique em “Novo agrupamento” para juntar seus serviços em pacotes."
                  : "Limpe a busca ou escolha o filtro “Todos” para ver a lista completa."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {lista.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-[12rem] flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{g.nome}</span>
                      <StatusBadge status={g.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {g.total_servicos === 0
                        ? "Nenhum serviço incluído"
                        : `${g.total_servicos} serviço${g.total_servicos > 1 ? "s" : ""}`}
                      {" · "}
                      Soma de venda:{" "}
                      {g.total_venda == null ? "não informado" : `R$ ${formatMoney(g.total_venda)}`}
                      {g.descricao ? ` · ${g.descricao}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconAction
                      label="Editar agrupamento"
                      ariaLabel={`Editar ${g.nome}`}
                      onClick={() => navigate(`/admin/agrupamento-servicos/${g.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </IconAction>
                    <IconAction
                      label={g.status === "ATIVO" ? "Inativar agrupamento" : "Ativar agrupamento"}
                      ariaLabel={`${g.status === "ATIVO" ? "Inativar" : "Ativar"} ${g.nome}`}
                      onClick={() => setAlvoStatus(g)}
                    >
                      <Power className="h-4 w-4" />
                    </IconAction>
                    <IconAction
                      label="Excluir agrupamento"
                      ariaLabel={`Excluir ${g.nome}`}
                      className="text-destructive hover:text-destructive"
                      onClick={() => setAlvoExclusao(g)}
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

      {/* Confirmação de status */}
      <AlertDialog open={Boolean(alvoStatus)} onOpenChange={(v) => (v ? null : setAlvoStatus(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {alvoStatus?.status === "ATIVO" ? "Inativar agrupamento?" : "Ativar agrupamento?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {alvoStatus?.status === "ATIVO"
                ? `“${alvoStatus?.nome}” deixará de aparecer como disponível, mas continua no histórico.`
                : `“${alvoStatus?.nome}” voltará a ficar disponível para uso.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarStatus}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de exclusão */}
      <AlertDialog
        open={Boolean(alvoExclusao)}
        onOpenChange={(v) => (v ? null : setAlvoExclusao(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agrupamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O agrupamento “{alvoExclusao?.nome}” será removido definitivamente. Os serviços que
              fazem parte dele continuam cadastrados normalmente. Se preferir manter o histórico,
              use a opção de inativar.
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
