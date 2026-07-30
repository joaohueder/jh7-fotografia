import { AlertTriangle, Loader2 } from "lucide-react";

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
import { useImpactoExclusaoCliente } from "@/hooks/use-impacto-exclusao";
import { rotuloStatus, type OrcamentoStatus } from "@/hooks/use-orcamentos";

interface Props {
  /** Id do cliente/lead que será excluído. Nulo mantém o diálogo fechado. */
  clienteId: string | null;
  /** Nome mostrado na confirmação. */
  nome: string | null;
  /** Rótulo do cadastro: "cliente" ou "lead". */
  tipo?: "cliente" | "lead";
  onCancelar: () => void;
  onConfirmar: () => void;
  /** Ação alternativa quando a exclusão é bloqueada por dados críticos. */
  onInativar?: () => void;
  /** Texto do botão alternativo, ex.: "Inativar cliente". */
  rotuloInativar?: string;

}

function Linha({ valor, texto }: { valor: number; texto: string }) {
  return (
    <li className="flex items-baseline gap-2">
      <span className="min-w-6 text-right font-semibold tabular-nums">{valor}</span>
      <span>{texto}</span>
    </li>
  );
}

function plural(n: number, singular: string, plural: string) {
  return n === 1 ? singular : plural;
}

/**
 * Confirmação de exclusão que mostra, antes de apagar, tudo que será
 * removido junto com o cadastro (contatos, anotações e orçamentos).
 */
export function ConfirmarExclusaoCliente({
  clienteId,
  nome,
  tipo = "cliente",
  onCancelar,
  onConfirmar,
  onInativar,
  rotuloInativar,
}: Props) {
  const { data: impacto, isLoading } = useImpactoExclusaoCliente(clienteId);

  const nada =
    impacto &&
    impacto.contatos === 0 &&
    impacto.notas === 0 &&
    impacto.orcamentos === 0;

  // Dados críticos: orçamentos que já saíram do rascunho não podem ser apagados.
  const bloqueado = Boolean(impacto?.temOrcamentoEmAndamento);


  return (
    <AlertDialog open={!!clienteId} onOpenChange={(o) => !o && onCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {bloqueado ? `Não é possível excluir este ${tipo}` : `Excluir ${tipo}`}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left">
              <p>
                {bloqueado ? (
                  <>
                    Veja o que está ligado ao cadastro de <strong>{nome}</strong>:
                  </>
                ) : (
                  <>
                    Esta ação não pode ser desfeita. Confira o que será apagado junto com{" "}
                    <strong>{nome}</strong>:
                  </>
                )}
              </p>


              {isLoading && (
                <p className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Conferindo o que está ligado a este cadastro…
                </p>
              )}

              {impacto && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  {nada ? (
                    <p>
                      Nenhum contato adicional, anotação ou orçamento está ligado a este cadastro.
                      Somente a ficha será removida.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      <Linha
                        valor={1}
                        texto={`ficha do ${tipo} (dados pessoais, endereço e contato principal)`}
                      />
                      {impacto.contatos > 0 && (
                        <Linha
                          valor={impacto.contatos}
                          texto={plural(
                            impacto.contatos,
                            "contato adicional cadastrado",
                            "contatos adicionais cadastrados",
                          )}
                        />
                      )}
                      {impacto.notas > 0 && (
                        <Linha
                          valor={impacto.notas}
                          texto={plural(
                            impacto.notas,
                            "anotação do histórico (inclusive o interesse inicial)",
                            "anotações do histórico (inclusive o interesse inicial)",
                          )}
                        />
                      )}
                      {impacto.orcamentos > 0 && (
                        <>
                          <Linha
                            valor={impacto.orcamentos}
                            texto={plural(impacto.orcamentos, "orçamento", "orçamentos")}
                          />
                          {impacto.itens > 0 && (
                            <Linha
                              valor={impacto.itens}
                              texto={plural(
                                impacto.itens,
                                "serviço/produto dentro dos orçamentos",
                                "serviços/produtos dentro dos orçamentos",
                              )}
                            />
                          )}
                          {impacto.ajustes > 0 && (
                            <Linha
                              valor={impacto.ajustes}
                              texto={plural(
                                impacto.ajustes,
                                "desconto/acréscimo aplicado",
                                "descontos/acréscimos aplicados",
                              )}
                            />
                          )}
                        </>
                      )}
                    </ul>
                  )}

                  {impacto.orcamentos > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Situação dos orçamentos:{" "}
                      {Object.entries(impacto.orcamentosPorStatus)
                        .map(
                          ([status, qtd]) =>
                            `${qtd} ${rotuloStatus(status as OrcamentoStatus).toLowerCase()}`,
                        )
                        .join(", ")}
                      .
                    </p>
                  )}
                </div>
              )}

              {bloqueado && (
                <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Este cadastro tem informações importantes que não podem ser perdidas: existem
                    orçamentos que já saíram do rascunho. Por isso a exclusão está bloqueada. Use a
                    opção abaixo para tirar o cadastro do dia a dia sem perder o histórico.
                  </span>
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{bloqueado ? "Voltar" : "Cancelar"}</AlertDialogCancel>
          {bloqueado ? (
            onInativar && (
              <AlertDialogAction onClick={onInativar}>
                {rotuloInativar ?? `Inativar ${tipo}`}
              </AlertDialogAction>
            )
          ) : (
            <AlertDialogAction onClick={onConfirmar} disabled={isLoading}>
              Excluir mesmo assim
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>

    </AlertDialog>
  );
}
