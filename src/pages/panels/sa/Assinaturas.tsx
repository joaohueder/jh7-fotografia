import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, FileSignature, Loader2, PowerOff } from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { SA_MENU } from "@/pages/panels/sa/menu";
import {
  useEncerrarAssinatura,
  useTodasAssinaturas,
  type AssinaturaComEmpresa,
} from "@/hooks/use-assinaturas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { notifyError, notifySuccess } from "@/lib/system-message";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Filtro = "TODAS" | "ATIVAS" | "INATIVAS" | "V5" | "V10" | "V15" | "V20";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "TODAS", label: "Todas" },
  { key: "ATIVAS", label: "Ativas" },
  { key: "INATIVAS", label: "Inativas" },
  { key: "V5", label: "Vence em 5 dias" },
  { key: "V10", label: "Vence em 10 dias" },
  { key: "V15", label: "Vence em 15 dias" },
  { key: "V20", label: "Vence em 20 dias" },
];

/** Janelas de vencimento (dias restantes de 0 até N). */
const JANELA: Partial<Record<Filtro, number>> = { V5: 5, V10: 10, V15: 15, V20: 20 };

function formataData(iso: string | null) {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

function SituacaoBadge({ a }: { a: AssinaturaComEmpresa }) {
  const vencida = a.ativo && a.dias_restantes !== null && a.dias_restantes < 0;
  const label = a.vigente ? "Ativa" : vencida ? "Vencida" : "Inativa";
  const cor = a.vigente
    ? "var(--brand-green)"
    : vencida
      ? "hsl(var(--destructive))"
      : "hsl(var(--muted-foreground))";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
      style={{
        borderColor: `color-mix(in oklab, ${cor} 55%, transparent)`,
        color: cor,
        background: `color-mix(in oklab, ${cor} 12%, transparent)`,
      }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: cor }} />
      {label}
    </span>
  );
}

function VencimentoTexto({ a }: { a: AssinaturaComEmpresa }) {
  if (!a.ativo) return <span className="text-muted-foreground">Encerrada</span>;
  if (a.dias_restantes === null) return <span className="text-muted-foreground">Sem prazo</span>;
  if (a.dias_restantes < 0)
    return <span style={{ color: "hsl(var(--destructive))" }}>Vencida há {-a.dias_restantes} d</span>;
  const alerta = a.dias_restantes <= 10;
  return (
    <span style={{ color: alerta ? "var(--panel-accent)" : undefined }}>
      {a.dias_restantes === 0 ? "Vence hoje" : `Vence em ${a.dias_restantes} d`}
    </span>
  );
}

export default function AssinaturasList() {
  usePageMeta("Assinaturas — JH7 Gestão Fotográfica", "Assinaturas das empresas do SaaS.");

  const { data, isLoading, error } = useTodasAssinaturas();
  const expirar = useEncerrarAssinatura();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [assinaturaAlvo, setAssinaturaAlvo] = useState<AssinaturaComEmpresa | null>(null);

  async function confirmarExpiracao() {
    if (!assinaturaAlvo) return;

    try {
      await expirar.mutateAsync({
        id: assinaturaAlvo.id,
        empresaId: assinaturaAlvo.empresa_id,
        observacao: "Assinatura expirada manualmente pelo painel SA.",
      });
      notifySuccess(`Assinatura de ${assinaturaAlvo.empresa_nome} expirada com sucesso.`);
      setAssinaturaAlvo(null);
    } catch (err) {
      notifyError(err, { description: "Não foi possível expirar a assinatura." });
    }
  }

  const lista = useMemo(() => {
    let list = data ?? [];
    const term = busca.trim().toLowerCase();
    if (term) {
      list = list.filter((a) =>
        [a.empresa_nome, a.plano_nome, a.empresa_cidade ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    }
    if (filtro === "ATIVAS") list = list.filter((a) => a.vigente);
    else if (filtro === "INATIVAS") list = list.filter((a) => !a.vigente);
    else if (JANELA[filtro] !== undefined) {
      const limite = JANELA[filtro]!;
      list = list.filter(
        (a) =>
          a.vigente &&
          a.dias_restantes !== null &&
          a.dias_restantes >= 0 &&
          a.dias_restantes <= limite,
      );
    }
    return list;
  }, [data, busca, filtro]);

  const resumo = useMemo(() => {
    const list = data ?? [];
    const ativas = list.filter((a) => a.vigente).length;
    const vence10 = list.filter(
      (a) => a.vigente && a.dias_restantes !== null && a.dias_restantes >= 0 && a.dias_restantes <= 10,
    ).length;
    return { total: list.length, ativas, inativas: list.length - ativas, vence10 };
  }, [data]);

  return (
    <PanelLayout accent="sa" menu={SA_MENU}>
      <div className="space-y-6">
        <header>
          <h1 className="text-[clamp(1.375rem,5vw,1.75rem)] font-bold tracking-tight">
            Assinaturas
          </h1>
          <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
            Todas as assinaturas contratadas pelas empresas.
          </p>
        </header>

        <div className="hidden gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(13rem,100%),1fr))] md:grid">
          {[
            { label: "Total", valor: resumo.total, cor: "var(--panel-accent)" },
            { label: "Ativas", valor: resumo.ativas, cor: "var(--brand-green)" },
            { label: "Inativas", valor: resumo.inativas, cor: "hsl(var(--muted-foreground))" },
            { label: "Vencem em até 10 dias", valor: resumo.vence10, cor: "var(--panel-accent)" },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.25rem)]"
            >
              <h3 className="text-sm font-semibold text-muted-foreground">{c.label}</h3>
              <p
                className="mt-2 text-[clamp(1.75rem,6vw,2rem)] font-bold leading-tight"
                style={{ color: c.cor }}
              >
                {c.valor}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por empresa, plano ou cidade"
            className="h-11 text-base"
            aria-label="Buscar assinaturas"
          />
          <div
            role="group"
            aria-label="Filtrar assinaturas"
            className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface/50 p-1"
          >
            {FILTROS.map((op) => {
              const ativo = filtro === op.key;
              return (
                <button
                  key={op.key}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setFiltro(op.key)}
                  className="min-h-[var(--tap)] flex-1 whitespace-nowrap rounded-lg px-3 text-[0.8125rem] font-semibold transition-colors"
                  style={{
                    background: ativo
                      ? "color-mix(in oklab, var(--panel-accent) 15%, transparent)"
                      : undefined,
                    color: ativo ? "var(--panel-accent)" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {op.label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : error ? (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            Não foi possível carregar as assinaturas: {(error as Error).message}
          </p>
        ) : lista.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <FileSignature className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma assinatura encontrada para este filtro.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: cards empilhados */}
            <ul className="grid gap-3 md:hidden">
              {lista.map((a) => (
                <li key={a.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/sa/empresas/${a.empresa_id}`}
                        className="truncate font-semibold hover:underline"
                      >
                        {a.empresa_nome}
                      </Link>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{a.plano_nome}</p>
                    </div>
                    <SituacaoBadge a={a} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Início:</span>{" "}
                      {formataData(a.inicio)}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Fim:</span> {formataData(a.fim)}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Valor:</span>{" "}
                      {a.gratuito ? "Gratuito" : a.valor !== null ? BRL.format(a.valor) : "—"}
                    </p>
                    <p className="flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      <VencimentoTexto a={a} />
                    </p>
                  </div>
                  {a.ativo ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setAssinaturaAlvo(a)}
                    >
                      <PowerOff className="mr-2 h-4 w-4" />
                      Expirar assinatura
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>

            {/* Desktop: tabela */}
            <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
              <table className="w-full text-sm">
                <thead className="bg-surface/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Plano</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Início</th>
                    <th className="px-4 py-3">Fim</th>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3">Situação</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="px-4 py-3">
                        <Link
                          to={`/sa/empresas/${a.empresa_id}`}
                          className="font-medium hover:underline"
                        >
                          {a.empresa_nome}
                        </Link>
                        {a.empresa_cidade ? (
                          <span className="block text-xs text-muted-foreground">
                            {a.empresa_cidade}
                            {a.empresa_uf ? `/${a.empresa_uf}` : ""}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{a.plano_nome}</td>
                      <td className="px-4 py-3">
                        {a.gratuito ? "Gratuito" : a.valor !== null ? BRL.format(a.valor) : "—"}
                      </td>
                      <td className="px-4 py-3">{formataData(a.inicio)}</td>
                      <td className="px-4 py-3">{formataData(a.fim)}</td>
                      <td className="px-4 py-3">
                        <VencimentoTexto a={a} />
                      </td>
                      <td className="px-4 py-3">
                        <SituacaoBadge a={a} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {a.ativo ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setAssinaturaAlvo(a)}
                          >
                            <PowerOff className="mr-2 h-4 w-4" />
                            Expirar
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <AlertDialog
          open={Boolean(assinaturaAlvo)}
          onOpenChange={(open) => !open && !expirar.isPending && setAssinaturaAlvo(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Expirar assinatura?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação encerra imediatamente a assinatura de {assinaturaAlvo?.empresa_nome ?? "esta empresa"}. A empresa ficará sem plano ativo até contratar ou receber uma nova assinatura.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={expirar.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void confirmarExpiracao()}
                disabled={expirar.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {expirar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Expirar assinatura
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PanelLayout>
  );
}
