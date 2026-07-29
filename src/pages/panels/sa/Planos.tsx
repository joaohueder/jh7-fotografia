import { useMemo, useState } from "react";
import { Layers, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { IconAction } from "@/components/icon-action";
import { SA_MENU } from "@/pages/panels/sa/menu";
import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import {
  usePlanos,
  useCreatePlano,
  useUpdatePlano,
  useDeletePlano,
  type Plano,
} from "@/hooks/use-planos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

/** Converte "149,90" ou "149.90" em número; retorna null se inválido. */
function parseValor(input: string): number | null {
  const limpo = input.replace(/\s|R\$/g, "").replace(/\./g, "").replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function PlanosList() {
  usePageMeta("Planos — JH7 Gestão Fotográfica", "Planos comerciais do SaaS.");

  const { data, isLoading, error } = usePlanos();
  const criar = useCreatePlano();
  const atualizar = useUpdatePlano();
  const remover = useDeletePlano();

  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<Plano | null>(null);
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [gratuito, setGratuito] = useState(false);
  const [valor, setValor] = useState("");
  const [alvo, setAlvo] = useState<Plano | null>(null);

  const salvando = criar.isPending || atualizar.isPending;

  const planos = useMemo(() => {
    const term = busca.trim().toLowerCase();
    const list = data ?? [];
    if (!term) return list;
    return list.filter((p) => p.nome.toLowerCase().includes(term));
  }, [data, busca]);

  const vazio = !isLoading && !error && (data?.length ?? 0) === 0;

  function abrirNovo() {
    setEditando(null);
    setNome("");
    setAtivo(true);
    setGratuito(false);
    setValor("");
    setAberto(true);
  }

  function abrirEdicao(plano: Plano) {
    setEditando(plano);
    setNome(plano.nome);
    setAtivo(plano.ativo);
    setGratuito(plano.gratuito);
    setValor(plano.valor === null ? "" : plano.valor.toFixed(2).replace(".", ","));
    setAberto(true);
  }

  async function salvar() {
    const nomeLimpo = nome.trim();
    if (nomeLimpo.length < 2) {
      notifyValidation("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    if (nomeLimpo.length > 60) {
      notifyValidation("O nome do plano deve ter no máximo 60 caracteres.");
      return;
    }

    let valorNumero: number | null = null;
    if (!gratuito) {
      valorNumero = parseValor(valor);
      if (valorNumero === null) {
        notifyValidation("Informe o valor do plano (ex.: 149,90).");
        return;
      }
      if (valorNumero < 0 || valorNumero > 999999.99) {
        notifyValidation("O valor do plano deve estar entre 0 e 999.999,99.");
        return;
      }
    }

    const payload = { nome: nomeLimpo, ativo, gratuito, valor: valorNumero };

    try {
      if (editando) {
        await atualizar.mutateAsync({ id: editando.id, ...payload });
        notifySuccess("Plano atualizado.");
      } else {
        await criar.mutateAsync(payload);
        notifySuccess("Plano criado.");
      }
      setAberto(false);
      setEditando(null);
      setNome("");
      setValor("");
    } catch (err) {
      notifyError(err);
    }
  }

  async function confirmarExclusao() {
    if (!alvo) return;
    try {
      await remover.mutateAsync(alvo.id);
      notifySuccess("Plano excluído.");
      setAlvo(null);
    } catch (err) {
      notifyError(err);
    }
  }

  return (
    <PanelLayout accent="sa" menu={SA_MENU}>
      <div className="space-y-[clamp(1.25rem,4vw,2rem)]">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">Planos</h1>
            <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
              Planos comerciais oferecidos pelo SaaS.
            </p>
          </div>
          <Button type="button" className="tap-target" onClick={abrirNovo}>
            <Plus className="mr-2 h-4 w-4" />
            Novo plano
          </Button>
        </header>

        {!vazio && (
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar plano..."
            aria-label="Buscar plano pelo nome"
            className="max-w-sm"
          />
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando planos...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Não foi possível carregar os planos: {(error as Error).message}
          </div>
        )}

        {vazio && (
          <div className="rounded-xl border border-dashed border-border bg-card p-[clamp(1.5rem,5vw,2.5rem)] text-center">
            <Layers className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">Nenhum plano cadastrado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie o primeiro plano para começar a organizar as assinaturas.
            </p>
            <Button type="button" className="tap-target mt-4" onClick={abrirNovo}>
              <Plus className="mr-2 h-4 w-4" />
              Novo plano
            </Button>
          </div>
        )}

        {!isLoading && !error && planos.length > 0 && (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(16rem,100%),1fr))]">
            {planos.map((plano) => (
              <article
                key={plano.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.25rem)] transition-colors hover:border-[var(--panel-accent)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
                      color: "var(--panel-accent)",
                    }}
                  >
                    <Layers className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold leading-tight">{plano.nome}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {plano.gratuito ? "Gratuito" : plano.valor !== null ? BRL.format(plano.valor) : "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${
                          plano.ativo
                            ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {plano.ativo ? "Ativo" : "Inativo"}
                      </span>
                      {plano.gratuito && (
                        <span className="inline-flex items-center rounded-full bg-[color-mix(in_oklab,var(--panel-accent)_14%,transparent)] px-2 py-0.5 text-[0.7rem] font-medium text-[var(--panel-accent)]">
                          Plano gratuito
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <IconAction
                    label="Editar"
                    ariaLabel={`Editar plano ${plano.nome}`}
                    onClick={() => abrirEdicao(plano)}
                  >
                    <Pencil className="h-4 w-4" />
                  </IconAction>
                  <IconAction
                    label="Excluir"
                    ariaLabel={`Excluir plano ${plano.nome}`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => setAlvo(plano)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconAction>
                </div>
              </article>
            ))}
          </div>
        )}

        {!isLoading && !error && !vazio && planos.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum plano encontrado para essa busca.</p>
        )}
      </div>

      <Dialog open={aberto} onOpenChange={(open) => !salvando && setAberto(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar plano" : "Novo plano"}</DialogTitle>
            <DialogDescription>Informe o nome do plano.</DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void salvar();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="plano-nome">Nome do plano</Label>
              <Input
                id="plano-nome"
                value={nome}
                maxLength={60}
                autoFocus
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Essencial"
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="plano-ativo">Status</Label>
                <p className="text-xs text-muted-foreground">
                  {ativo ? "Plano ativo e disponível." : "Plano inativo."}
                </p>
              </div>
              <Switch id="plano-ativo" checked={ativo} onCheckedChange={setAtivo} />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="plano-gratuito">Plano gratuito</Label>
                <p className="text-xs text-muted-foreground">
                  {gratuito ? "Sim — sem cobrança." : "Não — informe o valor."}
                </p>
              </div>
              <Switch id="plano-gratuito" checked={gratuito} onCheckedChange={setGratuito} />
            </div>

            {!gratuito && (
              <div className="space-y-2">
                <Label htmlFor="plano-valor">Valor do plano (R$)</Label>
                <Input
                  id="plano-valor"
                  inputMode="decimal"
                  value={valor}
                  maxLength={12}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="Ex.: 149,90"
                />
              </div>
            )}
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="tap-target"
              disabled={salvando}
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
            <Button type="button" className="tap-target" disabled={salvando} onClick={() => void salvar()}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(alvo)} onOpenChange={(open) => !open && setAlvo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano</AlertDialogTitle>
            <AlertDialogDescription>
              O plano <strong>{alvo?.nome}</strong> será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="tap-target">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="tap-target bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmarExclusao();
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelLayout>
  );
}
