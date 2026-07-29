import { useState } from "react";
import { Loader2, MessageSquarePlus, StickyNote, Trash2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { HelpTip } from "@/components/page-help";
import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import {
  MODULO_LABEL,
  useAdicionarNota,
  useClienteNotas,
  useExcluirNota,
  type NotaModulo,
} from "@/hooks/use-cliente-notas";

/** "agora", "10 minutos", "3 dias"… tempo decorrido desde a nota. */
function tempoDecorrido(iso: string) {
  const seg = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seg < 45) return "agora";
  const unidades: [number, string, string][] = [
    [60, "minuto", "minutos"],
    [24, "hora", "horas"],
    [7, "dia", "dias"],
    [4.345, "semana", "semanas"],
    [12, "mês", "meses"],
  ];
  let valor = seg / 60;
  let singular = "minuto";
  let plural = "minutos";
  for (let i = 0; i < unidades.length; i += 1) {
    const [limite, s, p] = unidades[i];
    if (i > 0) {
      singular = s;
      plural = p;
    }
    if (valor < limite || i === unidades.length - 1) {
      if (i === unidades.length - 1 && valor >= limite) {
        valor = valor / limite;
        singular = "ano";
        plural = "anos";
      }
      break;
    }
    valor = valor / limite;
  }
  const n = Math.floor(valor);
  return `há ${n} ${n === 1 ? singular : plural}`;
}

function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  clienteId: string | undefined;
  /** Módulo em que a nota está sendo criada (fica registrado no histórico). */
  modulo: NotaModulo;
  titulo?: string;
  placeholder?: string;
  /** Texto de ajuda no cabeçalho. */
  ajuda?: string;
}

/** Histórico de notas internas do cliente/lead (mais novas no topo). */
export function ClienteNotas({
  clienteId,
  modulo,
  titulo = "Notas internas",
  placeholder = "Ex.: interessada em ensaio gestante para setembro.",
  ajuda = "Registre quantas notas quiser. Cada nota guarda data, hora, quem escreveu e em qual tela foi criada. As mais novas aparecem no topo.",
}: Props) {
  const { data: notas, isLoading } = useClienteNotas(clienteId);
  const adicionar = useAdicionarNota();
  const excluir = useExcluirNota();
  const [texto, setTexto] = useState("");
  const [removendo, setRemovendo] = useState<string | null>(null);

  async function salvarNota() {
    if (!clienteId) return;
    if (!texto.trim()) {
      notifyValidation("Escreva a nota antes de adicionar.");
      return;
    }
    try {
      await adicionar.mutateAsync({ clienteId, descricao: texto, modulo });
      setTexto("");
      notifySuccess("Nota adicionada.");
    } catch (err) {
      notifyError(err, { title: "Não foi possível adicionar a nota" });
    }
  }

  async function removerNota(id: string) {
    if (!clienteId) return;
    setRemovendo(id);
    try {
      await excluir.mutateAsync({ id, clienteId });
      notifySuccess("Nota excluída.");
    } catch (err) {
      notifyError(err, { title: "Não foi possível excluir a nota" });
    } finally {
      setRemovendo(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5">
        <StickyNote className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <HelpTip text={ajuda} />
      </div>

      <div className="space-y-2">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="text-base"
          disabled={!clienteId}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            className="tap-target gap-2"
            onClick={salvarNota}
            disabled={!clienteId || adicionar.isPending}
          >
            {adicionar.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="h-4 w-4" />
            )}
            Adicionar nota
          </Button>
        </div>
        {!clienteId ? (
          <p className="text-xs text-muted-foreground">
            Salve o cadastro primeiro para começar a registrar notas.
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando notas…
        </p>
      ) : (notas ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nenhuma nota registrada até agora.
        </p>
      ) : (
        <ul className="space-y-2">
          {(notas ?? []).map((n) => (
            <li key={n.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{dataHora(n.created_at)}</span>
                <span>· {tempoDecorrido(n.created_at)}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {MODULO_LABEL[n.modulo] ?? n.modulo}
                </Badge>
                <span className="inline-flex items-center gap-1">
                  <UserRound className="h-3 w-3" />
                  {n.criado_por_nome ?? "Usuário do sistema"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-8 w-8"
                  aria-label="Excluir nota"
                  onClick={() => removerNota(n.id)}
                  disabled={removendo === n.id}
                >
                  {removendo === n.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-foreground">
                {n.descricao}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
