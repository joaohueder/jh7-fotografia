import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GripVertical, Layers, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { IconAction } from "@/components/icon-action";
import { SA_MENU } from "@/pages/panels/sa/menu";
import { notifyError, notifySuccess } from "@/lib/system-message";
import {
  usePlanos,
  useDeletePlano,
  useReordenarPlanos,
  type Plano,
} from "@/hooks/use-planos";
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

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

interface CardProps {
  plano: Plano;
  arrastavel: boolean;
  onEditar: (p: Plano) => void;
  onExcluir: (p: Plano) => void;
}

function PlanoCard({ plano, arrastavel, onEditar, onExcluir }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: plano.id,
    disabled: !arrastavel,
  });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 20 : undefined,
      }}
      className="relative flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.25rem)] transition-colors hover:border-[var(--panel-accent)]"
    >
      <div className="flex min-w-0 items-center gap-2">
        {arrastavel && (
          <button
            type="button"
            aria-label={`Reordenar plano ${plano.nome}`}
            className="tap-target -ml-1 shrink-0 cursor-grab touch-none rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
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
          onClick={() => onEditar(plano)}
        >
          <Pencil className="h-4 w-4" />
        </IconAction>
        <IconAction
          label="Excluir"
          ariaLabel={`Excluir plano ${plano.nome}`}
          className="text-destructive hover:text-destructive"
          onClick={() => onExcluir(plano)}
        >
          <Trash2 className="h-4 w-4" />
        </IconAction>
      </div>
    </article>
  );
}

export default function PlanosList() {
  usePageMeta("Planos — JH7 Gestão Fotográfica", "Planos comerciais do SaaS.");

  const navigate = useNavigate();
  const { data, isLoading, error } = usePlanos();
  const remover = useDeletePlano();
  const reordenar = useReordenarPlanos();

  const [busca, setBusca] = useState("");
  const [alvo, setAlvo] = useState<Plano | null>(null);
  const [ordem, setOrdem] = useState<Plano[]>([]);

  useEffect(() => {
    setOrdem(data ?? []);
  }, [data]);

  const termo = busca.trim().toLowerCase();
  const arrastavel = termo.length === 0;

  const planos = useMemo(() => {
    if (!termo) return ordem;
    return ordem.filter((p) => p.nome.toLowerCase().includes(termo));
  }, [ordem, termo]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const vazio = !isLoading && !error && (data?.length ?? 0) === 0;

  function abrirNovo() {
    navigate("/sa/planos/novo");
  }

  function abrirEdicao(plano: Plano) {
    navigate(`/sa/planos/${plano.id}`);
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

  async function aoSoltar(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const anterior = ordem;
    const de = ordem.findIndex((p) => p.id === active.id);
    const para = ordem.findIndex((p) => p.id === over.id);
    if (de < 0 || para < 0) return;

    const nova = arrayMove(ordem, de, para);
    setOrdem(nova);

    try {
      await reordenar.mutateAsync(nova.map((p) => p.id));
      notifySuccess("Ordem dos planos atualizada.");
    } catch (err) {
      setOrdem(anterior);
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
          <div className="space-y-2">
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar plano..."
              aria-label="Buscar plano pelo nome"
              className="max-w-sm"
            />
            <p className="text-xs text-muted-foreground">
              {arrastavel
                ? "Arraste os cards pela alça para definir a ordem de exibição dos planos."
                : "Limpe a busca para reordenar os planos."}
            </p>
          </div>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToParentElement]}
            onDragEnd={(e) => void aoSoltar(e)}
          >
            <SortableContext items={planos.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(16rem,100%),1fr))]">
                {planos.map((plano) => (
                  <PlanoCard
                    key={plano.id}
                    plano={plano}
                    arrastavel={arrastavel}
                    onEditar={abrirEdicao}
                    onExcluir={setAlvo}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {!isLoading && !error && !vazio && planos.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum plano encontrado para essa busca.</p>
        )}
      </div>

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
