import type { ReactNode } from "react";
import { HelpCircle, Info, Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Bloco explicativo padrão das telas do painel.
 *
 * Objetivo: qualquer pessoa, mesmo sem experiência com sistemas, entender
 * "o que é esta tela", "para que serve" e "o que fazer aqui" sem treinamento.
 */
export function PageHelp({
  title = "Como usar esta tela",
  children,
  steps,
  className,
}: {
  title?: string;
  children?: ReactNode;
  steps?: string[];
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn("rounded-2xl border border-border bg-muted/40 p-4 sm:p-5", className)}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl"
          style={{
            background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
            color: "var(--panel-accent)",
          }}
        >
          <Lightbulb className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 space-y-2">
          <h2 className="text-sm font-bold tracking-tight">{title}</h2>
          {children ? (
            <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
          ) : null}
          {steps?.length ? (
            <ol className="grid gap-1.5 text-sm leading-relaxed text-muted-foreground">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-2">
                  <span
                    aria-hidden
                    className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border text-[11px] font-bold"
                    style={{ color: "var(--panel-accent)" }}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0">{s}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** Dica curta em ícone de interrogação, para explicar um campo ou número. */
export function HelpTip({ text, label }: { text: string; label?: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label ?? `Ajuda: ${text}`}
            className="inline-grid h-6 w-6 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[16rem] text-xs leading-relaxed">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Aviso informativo simples, em linguagem do dia a dia. */
export function InlineNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground">
      <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}
