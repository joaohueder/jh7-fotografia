import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Loader2, Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOrcamentos, rotuloStatus } from "@/hooks/use-orcamentos";

function moeda(valor: number | null) {
  if (valor == null) return "Sem valor informado";
  return `R$ ${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function data(iso: string | null) {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return d ? `${d}/${m}/${a}` : iso;
}

/**
 * Lista, apenas para consulta, os orçamentos já criados para este cliente.
 * A criação e a edição continuam acontecendo no módulo Orçamentos.
 */
export function ClienteOrcamentos({ clienteId }: { clienteId: string }) {
  const navigate = useNavigate();
  const { data: todos, isLoading } = useOrcamentos();

  const voltar = encodeURIComponent(`/admin/clientes/${clienteId}?aba=orcamentos`);

  const lista = useMemo(
    () => (todos ?? []).filter((o) => o.cliente_id === clienteId),
    [todos, clienteId],
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando orçamentos…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Aqui ficam todas as propostas feitas para este cliente. Ao clicar em “Novo orçamento”, o
          cliente já vai preenchido e não pode ser trocado. Para alterar uma proposta, clique no botão “Editar” do card — ao
          salvar, voltar ou cancelar você retorna para esta aba.
        </p>
        <Button
          type="button"
          variant="outline"
          className="tap-target gap-2"
          onClick={() =>
            navigate(
              `/admin/orcamentos/novo?cliente=${clienteId}&voltar=${voltar}`,
            )
          }
        >
          <Plus className="h-4 w-4" />
          Novo orçamento
        </Button>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-semibold">Nenhum orçamento para este cliente</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando você criar uma proposta para ele no módulo Orçamentos, ela aparece aqui
            automaticamente.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {lista.map((o) => (
            <li key={o.id} className="relative">
              <div className="w-full rounded-xl border border-border bg-card p-4 pr-28 text-left">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{o.descricao || "Orçamento sem descrição"}</span>
                  <span className="flex items-center gap-2 text-xs">
                    <span
                      className="rounded-full px-2 py-0.5 font-semibold"
                      style={{
                        background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
                        color: "var(--panel-accent)",
                      }}
                    >
                      {rotuloStatus(o.status)}
                    </span>
                    {o.vencido ? (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-semibold text-destructive">
                        Vencido
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>Data: {data(o.data_orcamento)}</span>
                  <span>Validade: {data(o.validade)}</span>
                  <span>
                    {o.total_itens} serviço{o.total_itens === 1 ? "" : "s"}
                  </span>
                  <span className="font-semibold text-foreground">{moeda(o.total_final)}</span>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="tap-target absolute right-3 top-3 gap-1"
                onClick={() => navigate(`/admin/orcamentos/${o.id}?voltar=${voltar}`)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
