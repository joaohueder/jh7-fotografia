import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Eye, FileSignature, Loader2, Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { rotuloContratoStatus, useContratos } from "@/hooks/use-contratos";

function moeda(valor: number | null) {
  if (valor == null) return "Sem valor informado";
  return `R$ ${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function data(iso: string | null) {
  if (!iso) return "não informada";
  const [a, m, d] = iso.split("-");
  return d ? `${d}/${m}/${a}` : iso;
}

/** Contratos já firmados com este cliente, com criação e edição a partir da ficha. */
export function ClienteContratos({ clienteId }: { clienteId: string }) {
  const navigate = useNavigate();
  const { data: todos, isLoading } = useContratos();

  const voltar = encodeURIComponent(`/admin/clientes/${clienteId}?aba=contratos`);
  const lista = useMemo(
    () => (todos ?? []).filter((c) => c.cliente_id === clienteId),
    [todos, clienteId],
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando contratos…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Aqui ficam os contratos deste cliente. Ao clicar em “Novo contrato”, o cliente já vai
          preenchido e não pode ser trocado — basta escolher um orçamento aprovado para copiar os
          serviços. Só é possível alterar contratos em Rascunho; nas demais situações o contrato
          abre apenas para consulta.
        </p>
        <Button
          type="button"
          variant="outline"
          className="tap-target gap-2"
          onClick={() => navigate(`/admin/contratos/novo?cliente=${clienteId}&voltar=${voltar}`)}
        >
          <Plus className="h-4 w-4" />
          Novo contrato
        </Button>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <FileSignature className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-semibold">Nenhum contrato para este cliente</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Depois que um orçamento for aprovado, use “Novo contrato” para formalizar os serviços.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {lista.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="min-w-[12rem] flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{c.titulo}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
                      color: "var(--panel-accent)",
                    }}
                  >
                    {rotuloContratoStatus(c.status)}
                  </span>
                  {c.vencido ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                      <CalendarClock className="h-3 w-3" />
                      Vigência encerrada
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  Data: {data(c.data_contrato)} · Vigência: {data(c.inicio_vigencia)} até{" "}
                  {data(c.fim_vigencia)} · {c.total_itens} serviço
                  {c.total_itens === 1 ? "" : "s"} · {moeda(c.total_valor)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  navigate(
                    c.status === "RASCUNHO"
                      ? `/admin/contratos/${c.id}?voltar=${voltar}`
                      : `/admin/contratos/${c.id}?modo=ver&voltar=${voltar}`,
                  )
                }
              >
                {c.status === "RASCUNHO" ? (
                  <>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" /> Visualizar
                  </>
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ClienteContratos;
