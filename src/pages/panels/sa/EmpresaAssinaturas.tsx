import { useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CircleSlash,
  CreditCard,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";

import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import { formatMoney } from "@/lib/br-masks";
import {
  useAssinaturas,
  useDefinirAssinatura,
  useEncerrarAssinatura,
  type Assinatura,
} from "@/hooks/use-assinaturas";
import { usePlanos, type Plano } from "@/hooks/use-planos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

/** Data ISO (YYYY-MM-DD) em formato brasileiro. */
function formatDate(value: string | null) {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function hoje() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Vencimento da assinatura: início + vigência (30 dias por padrão). */
function vencimento(item: { inicio: string; fim: string | null; vigencia_dias?: number }) {
  if (item.fim) return item.fim.slice(0, 10);
  const d = new Date(`${item.inicio.slice(0, 10)}T00:00:00`);
  d.setDate(d.getDate() + (item.vigencia_dias || 30));
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Dias restantes até o vencimento (negativo quando já venceu). */
function diasRestantes(fimIso: string) {
  const fim = new Date(`${fimIso}T00:00:00`).getTime();
  const agora = new Date(`${hoje()}T00:00:00`).getTime();
  return Math.round((fim - agora) / 86400000);
}

function precoLabel(gratuito: boolean, valor: number | null) {
  if (gratuito) return "Gratuito";
  if (valor === null || valor === undefined) return "—";
  return formatMoney(valor);
}

/** Card de uma assinatura do histórico. */
function AssinaturaCard({
  item,
  onEncerrar,
  encerrando,
}: {
  item: Assinatura;
  onEncerrar: () => void;
  encerrando: boolean;
}) {
  const ativo = item.ativo;
  const restantes = diasRestantes(vencimento(item));
  return (
    <article
      className="flex flex-col gap-4 rounded-2xl border bg-card p-[clamp(1rem,3vw,1.25rem)] transition-shadow hover:shadow-md"
      style={{
        borderColor: ativo ? "var(--panel-accent)" : "hsl(var(--border))",
        background: ativo
          ? "color-mix(in oklab, var(--panel-accent) 6%, hsl(var(--card)))"
          : undefined,
      }}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
              color: "var(--panel-accent)",
            }}
          >
            {item.gratuito ? <Sparkles className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <h3 className="break-words text-base font-bold leading-tight">{item.plano_nome}</h3>
            <p
              className="mt-1 text-xl font-bold leading-tight"
              style={{ color: "var(--panel-accent)" }}
            >
              {precoLabel(item.gratuito, item.valor)}
            </p>
          </div>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={
            ativo
              ? { background: "rgb(34 197 94 / 0.15)", color: "rgb(21 128 61)" }
              : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
          }
        >
          {ativo ? <BadgeCheck className="h-3.5 w-3.5" /> : <CircleSlash className="h-3.5 w-3.5" />}
          {ativo ? "Ativa" : "Encerrada"}
        </span>
      </header>

      <dl className="grid gap-2 text-sm [grid-template-columns:repeat(auto-fit,minmax(min(12rem,100%),1fr))]">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <dt className="text-muted-foreground">Início:</dt>
          <dd className="font-medium">{formatDate(item.inicio) ?? "—"}</dd>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <dt className="text-muted-foreground">{ativo ? "Vence em:" : "Término:"}</dt>
          <dd className="font-medium">{formatDate(vencimento(item)) ?? "—"}</dd>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <dt className="text-muted-foreground">Vigência:</dt>
          <dd className="font-medium">{item.vigencia_dias || 30} dias</dd>
        </div>
      </dl>

      {ativo ? (
        <p
          className="rounded-xl px-3 py-2 text-sm font-semibold"
          style={
            restantes < 0
              ? { background: "hsl(var(--destructive) / 0.12)", color: "hsl(var(--destructive))" }
              : {
                  background: "color-mix(in oklab, var(--panel-accent) 12%, transparent)",
                  color: "var(--panel-accent)",
                }
          }
        >
          {restantes < 0
            ? `Vencida há ${Math.abs(restantes)} dia(s)`
            : restantes === 0
              ? "Vence hoje"
              : `Faltam ${restantes} dia(s) para o vencimento`}
        </p>
      ) : null}

      {item.observacao ? (
        <p className="whitespace-pre-wrap break-words rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
          {item.observacao}
        </p>
      ) : null}

      {ativo ? (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            className="tap-target"
            onClick={onEncerrar}
            disabled={encerrando}
          >
            {encerrando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Encerrar assinatura
          </Button>
        </div>
      ) : null}
    </article>
  );
}

/** Modal de seleção de plano. */
function SelecionarPlanoDialog({
  open,
  onOpenChange,
  planos,
  loading,
  selecionado,
  onSelecionar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planos: Plano[];
  loading: boolean;
  selecionado: string | null;
  onSelecionar: (plano: Plano) => void;
}) {
  const [busca, setBusca] = useState("");

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const ativos = planos.filter((p) => p.ativo);
    if (!termo) return ativos;
    return ativos.filter((p) => p.nome.toLowerCase().includes(termo));
  }, [planos, busca]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Selecionar plano</DialogTitle>
          <DialogDescription>
            Escolha um dos planos ativos para vincular a esta empresa.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar plano…"
            className="h-11 pl-9 text-base"
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando planos…
          </div>
        ) : lista.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Nenhum plano ativo encontrado. Cadastre ou ative um plano no módulo Planos.
          </p>
        ) : (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(14rem,100%),1fr))]">
            {lista.map((p) => {
              const active = selecionado === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelecionar(p)}
                  className="flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors"
                  style={{
                    borderColor: active ? "var(--panel-accent)" : "hsl(var(--border))",
                    background: active
                      ? "color-mix(in oklab, var(--panel-accent) 12%, transparent)"
                      : "hsl(var(--card))",
                  }}
                >
                  <span className="break-words text-sm font-bold">{p.nome}</span>
                  <span className="text-lg font-bold" style={{ color: "var(--panel-accent)" }}>
                    {precoLabel(p.gratuito, p.valor)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Aba de assinaturas da empresa: plano vigente + histórico completo. */
export function EmpresaAssinaturas({ empresaId }: { empresaId: string }) {
  const { data: assinaturas, isLoading } = useAssinaturas(empresaId);
  const { data: planos, isLoading: loadingPlanos } = usePlanos();
  const definir = useDefinirAssinatura();
  const encerrar = useEncerrarAssinatura();

  const [modalOpen, setModalOpen] = useState(false);
  const [plano, setPlano] = useState<Plano | null>(null);
  const [inicio, setInicio] = useState(hoje());
  const [observacao, setObservacao] = useState("");
  const [confirmarTroca, setConfirmarTroca] = useState(false);
  const [encerrarAlvo, setEncerrarAlvo] = useState<Assinatura | null>(null);

  const lista = assinaturas ?? [];
  const ativa = lista.find((a) => a.ativo) ?? null;
  const historico = lista.filter((a) => !a.ativo);

  function abrirConfirmacao() {
    if (!plano) {
      notifyValidation("Selecione um plano antes de contratar.");
      return;
    }
    if (!inicio) {
      notifyValidation("Informe a data de início da assinatura.");
      return;
    }
    if (ativa && inicio < ativa.inicio) {
      notifyValidation("A nova assinatura não pode começar antes da assinatura ativa atual.");
      return;
    }
    setConfirmarTroca(true);
  }

  async function contratar() {
    if (!plano) return;
    try {
      await definir.mutateAsync({
        empresaId,
        planoId: plano.id,
        inicio,
        observacao: observacao.trim() || null,
      });
      notifySuccess(
        ativa
          ? `Plano alterado para ${plano.nome}. A assinatura anterior foi encerrada.`
          : `Plano ${plano.nome} contratado.`,
      );
      setPlano(null);
      setObservacao("");
      setInicio(hoje());
    } catch (err) {
      notifyError(err);
    } finally {
      setConfirmarTroca(false);
    }
  }

  async function encerrarAtiva() {
    if (!encerrarAlvo) return;
    try {
      await encerrar.mutateAsync({ id: encerrarAlvo.id, empresaId });
      notifySuccess("Assinatura encerrada. A empresa está sem plano ativo.");
    } catch (err) {
      notifyError(err);
    } finally {
      setEncerrarAlvo(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Plano vigente ------------------------------------------------ */}
      <section className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
              color: "var(--panel-accent)",
            }}
          >
            <BadgeCheck className="h-4 w-4" />
          </span>
          Assinatura ativa
        </h2>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : ativa ? (
          <AssinaturaCard
            item={ativa}
            onEncerrar={() => setEncerrarAlvo(ativa)}
            encerrando={encerrar.isPending}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Esta empresa não possui assinatura ativa. Selecione um plano abaixo.
          </p>
        )}
      </section>

      {/* Contratar / trocar plano ------------------------------------- */}
      <section className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
              color: "var(--panel-accent)",
            }}
          >
            <CreditCard className="h-4 w-4" />
          </span>
          {ativa ? "Trocar de plano" : "Contratar plano"}
        </h2>

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(16rem,100%),1fr))]">
          <div className="space-y-2 md:col-span-full">
            <Label className="text-sm">
              Plano<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="tap-target h-11"
                onClick={() => setModalOpen(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                {plano ? "Alterar seleção" : "Selecionar plano"}
              </Button>
              {plano ? (
                <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold">
                  {plano.nome}
                  <span style={{ color: "var(--panel-accent)" }}>
                    {precoLabel(plano.gratuito, plano.valor)}
                  </span>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Nenhum plano selecionado</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">
              Início<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="h-11 text-base"
            />
            <p className="text-xs text-muted-foreground">
              Vigência de 30 dias — vence em{" "}
              <strong>{formatDate(vencimento({ inicio, fim: null })) ?? "—"}</strong>
            </p>
          </div>

          <div className="space-y-2 md:col-span-full">
            <Label className="text-sm">Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              placeholder="Condições negociadas, motivo da troca…"
              className="text-base"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            className="tap-target"
            onClick={abrirConfirmacao}
            disabled={!plano || definir.isPending}
          >
            {definir.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {ativa ? "Trocar plano" : "Contratar plano"}
          </Button>
        </div>
      </section>

      {/* Histórico ---------------------------------------------------- */}
      <section className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
              color: "var(--panel-accent)",
            }}
          >
            <CalendarDays className="h-4 w-4" />
          </span>
          Histórico de assinaturas
        </h2>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : historico.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhuma assinatura encerrada até o momento.
          </p>
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(18rem,100%),1fr))]">
            {historico.map((a) => (
              <AssinaturaCard key={a.id} item={a} onEncerrar={() => undefined} encerrando={false} />
            ))}
          </div>
        )}
      </section>

      <ContratarPlanoDialog
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) {
            setPlano(null);
            setObservacao("");
            setInicio(hoje());
          }
        }}
        planos={planos ?? []}
        loading={loadingPlanos}
        temAtiva={Boolean(ativa)}
        plano={plano}
        onPlano={setPlano}
        inicio={inicio}
        onInicio={setInicio}
        observacao={observacao}
        onObservacao={setObservacao}
        salvando={definir.isPending}
        onConfirmar={abrirConfirmacao}
      />


      <AlertDialog open={confirmarTroca} onOpenChange={setConfirmarTroca}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {ativa ? "Trocar o plano desta empresa?" : "Contratar este plano?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {ativa
                ? `A assinatura atual (${ativa.plano_nome}) será encerrada e o plano ${plano?.nome ?? ""} passará a ser o ativo.`
                : `O plano ${plano?.nome ?? ""} passará a ser a assinatura ativa desta empresa.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void contratar()}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(encerrarAlvo)}
        onOpenChange={(v) => !v && setEncerrarAlvo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar a assinatura ativa?</AlertDialogTitle>
            <AlertDialogDescription>
              A empresa ficará sem plano ativo até que um novo plano seja contratado. O registro
              permanece no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void encerrarAtiva()}>Encerrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
