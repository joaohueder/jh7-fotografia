import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquarePlus,
  StickyNote,
  Trash2,
  UserRound,
} from "lucide-react";

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
import { dataHora, tempoDecorrido } from "@/lib/tempo";

/** Quantidade de notas exibidas por página no histórico. */
const POR_PAGINA = 5;

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
  ajuda = "Registre quantas notas quiser. Cada nota guarda data, hora, quem escreveu e em qual tela foi criada. As mais novas aparecem no topo e a lista é dividida em páginas de 5 registros.",
}: Props) {
  const { data: notas, isLoading } = useClienteNotas(clienteId);
  const adicionar = useAdicionarNota();
  const excluir = useExcluirNota();
  const [texto, setTexto] = useState("");
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);

  const total = (notas ?? []).length;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  // Se a lista encolher (ex.: nota excluída), volta para uma página válida.
  useEffect(() => {
    setPagina((p) => Math.min(p, totalPaginas));
  }, [totalPaginas]);

  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = useMemo(
    () => (notas ?? []).slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA),
    [notas, paginaAtual],
  );

  async function salvarNota() {
    if (!clienteId) return;
    if (!texto.trim()) {
      notifyValidation("Escreva a nota antes de adicionar.");
      return;
    }
    try {
      await adicionar.mutateAsync({ clienteId, descricao: texto, modulo });
      setTexto("");
      setPagina(1);
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
        <>
        <ul className="space-y-2">
          {visiveis.map((n) => (
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

        {totalPaginas > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-xs text-muted-foreground">
              Mostrando {(paginaAtual - 1) * POR_PAGINA + 1}–
              {Math.min(paginaAtual * POR_PAGINA, total)} de {total} registros · página {paginaAtual}{" "}
              de {totalPaginas}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={paginaAtual <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual >= totalPaginas}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
        </>
      )}
    </div>
  );
}
