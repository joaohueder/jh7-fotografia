import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { HelpTip } from "@/components/page-help";

export interface PanelStat {
  title: string;
  value: string;
  /** Explicação em linguagem simples do que este número significa. */
  hint?: string;
}

interface PanelPageProps {
  title: string;
  subtitle: string;
  stats: PanelStat[];
  /** Explicação curta da tela, mostrada como dica no título. */
  help?: string;
  children?: ReactNode;
}

/**
 * Cabeçalho + grade de indicadores compartilhada pelos painéis.
 *
 * O título e cada indicador podem ter uma dica em ícone de interrogação,
 * para que pessoas sem familiaridade com sistemas entendam sozinhas.
 */
export function PanelPage({
  title,
  subtitle,
  stats,
  help,
  children,
}: PanelPageProps) {
  return (
    <div className="space-y-[clamp(1.5rem,4vw,2rem)]">
      <header className="space-y-1">
        <div className="flex items-center gap-1.5">
          <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">{title}</h1>
          {help ? <HelpTip text={help} /> : null}
        </div>
        <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">{subtitle}</p>
      </header>

      <div
        className={cn(
          "grid gap-4",
          "[grid-template-columns:repeat(auto-fit,minmax(min(14rem,100%),1fr))]",
        )}
      >
        {stats.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground">{card.title}</h3>
              {card.hint ? <HelpTip text={card.hint} /> : null}
            </div>
            <p
              className="mt-2 text-[clamp(1.75rem,6vw,2rem)] font-bold leading-tight"
              style={{ color: "var(--panel-accent)" }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {children}
    </div>
  );
}

export default PanelPage;
