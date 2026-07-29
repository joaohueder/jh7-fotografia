import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { HelpTip, PageHelp } from "@/components/page-help";

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
  /** Passos curtos explicando o que a pessoa pode fazer nesta tela. */
  helpTitle?: string;
  helpSteps?: string[];
  helpText?: ReactNode;
  children?: ReactNode;
}

/**
 * Cabeçalho + grade de indicadores compartilhada pelos painéis.
 *
 * Toda tela recebe um bloco "Como usar" e cada indicador pode ter uma dica,
 * para que pessoas sem familiaridade com sistemas entendam sozinhas.
 */
export function PanelPage({
  title,
  subtitle,
  stats,
  helpTitle,
  helpSteps,
  helpText,
  children,
}: PanelPageProps) {
  return (
    <div className="space-y-[clamp(1.5rem,4vw,2rem)]">
      <header className="space-y-1">
        <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">{title}</h1>
        <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">{subtitle}</p>
      </header>

      {helpSteps?.length || helpText ? (
        <PageHelp title={helpTitle} steps={helpSteps}>
          {helpText}
        </PageHelp>
      ) : null}

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
