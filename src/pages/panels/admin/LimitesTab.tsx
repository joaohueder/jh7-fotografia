import { AlertTriangle, Gauge, Infinity as InfinityIcon, Loader2, UserPlus, Users } from "lucide-react";

import { useLimitesEmpresa } from "@/hooks/use-limites";
import { HelpTip } from "@/components/page-help";
import { Progress } from "@/components/ui/progress";

function formatNumero(v: number) {
  return v.toLocaleString("pt-BR");
}

function CardLimite({
  icon: Icon,
  titulo,
  ajuda,
  usado,
  limite,
}: {
  icon: typeof Users;
  titulo: string;
  ajuda: string;
  usado: number;
  limite: number | null;
}) {
  const ilimitado = limite === null || limite === undefined;
  const restante = ilimitado ? null : Math.max(limite - usado, 0);
  const percentual = ilimitado || limite === 0 ? 0 : Math.min((usado / limite) * 100, 100);
  const estourou = !ilimitado && usado >= (limite ?? 0);
  const atencao = !ilimitado && !estourou && percentual >= 80;

  return (
    <article className="rounded-2xl border border-border bg-card p-[clamp(1rem,3vw,1.25rem)]">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
              color: "var(--panel-accent)",
            }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-bold">{titulo}</h3>
              <HelpTip text={ajuda} />
            </div>
            <p className="text-xs text-muted-foreground">
              {ilimitado ? "Sem limite no plano contratado" : `Limite do plano: ${formatNumero(limite!)}`}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-2xl font-bold leading-none">{formatNumero(usado)}</p>
        <p className="text-sm font-semibold text-muted-foreground">
          {ilimitado ? (
            <span className="inline-flex items-center gap-1">
              <InfinityIcon className="h-4 w-4" /> ilimitado
            </span>
          ) : (
            `de ${formatNumero(limite!)}`
          )}
        </p>
      </div>

      {!ilimitado ? (
        <>
          <Progress value={percentual} className="mt-3 h-2" />
          <p
            className={
              estourou
                ? "mt-2 text-xs font-semibold text-destructive"
                : atencao
                  ? "mt-2 text-xs font-semibold text-amber-600"
                  : "mt-2 text-xs text-muted-foreground"
            }
          >
            {estourou
              ? "Limite atingido — faça upgrade do plano para cadastrar mais."
              : `Restam ${formatNumero(restante ?? 0)} cadastro(s) disponíveis.`}
          </p>
        </>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          O plano atual não impõe limite para este cadastro.
        </p>
      )}
    </article>
  );
}

/** Aba Limites: mostra o que o plano da empresa permite e o quanto já foi usado. */
export function LimitesTab() {
  const { data, isLoading } = useLimitesEmpresa();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando limites do plano…
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.25rem)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
                color: "var(--panel-accent)",
              }}
            >
              <Gauge className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano atual</p>
              <p className="text-sm font-bold">
                {data.plano_nome ?? "Sem assinatura ativa"}
                {data.plano_nome && data.gratuito ? " (gratuito)" : ""}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Os limites abaixo vêm do plano contratado pela sua empresa.
          </p>
        </div>
      </div>

      {!data.plano_nome ? (
        <p className="flex items-start gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Sua empresa está sem assinatura ativa, então nenhum limite está definido. Contrate um
          plano para liberar os cadastros.
        </p>
      ) : null}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(18rem,100%),1fr))]">
        <CardLimite
          icon={UserPlus}
          titulo="Leads"
          ajuda="Total de leads cadastrados na sua empresa comparado ao limite do plano contratado."
          usado={data.usado_leads}
          limite={data.limite_leads}
        />
        <CardLimite
          icon={Users}
          titulo="Clientes"
          ajuda="Total de clientes com cadastro completo comparado ao limite do plano contratado."
          usado={data.usado_clientes}
          limite={data.limite_clientes}
        />
      </div>
    </div>
  );
}
