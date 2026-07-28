import { cn } from "@/lib/utils";

export interface PanelStat {
  title: string;
  value: string;
}

interface PanelPageProps {
  title: string;
  subtitle: string;
  stats: PanelStat[];
}

/**
 * Cabeçalho + grade de indicadores compartilhada pelos painéis.
 *
 * Grade: `auto-fit` com `minmax(min(14rem, 100%), 1fr)` — a quebra acontece
 * quando o conteúdo pede, não em breakpoints de dispositivo. Em telas muito
 * estreitas o `min(…, 100%)` impede que o card force scroll horizontal.
 * Números usam clamp() para escalar sem degraus entre mobile e ultrawide.
 */
export function PanelPage({ title, subtitle, stats }: PanelPageProps) {
  return (
    <div className="space-y-[clamp(1.5rem,4vw,2rem)]">
      <header className="space-y-1">
        <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">{title}</h1>
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
            <h3 className="text-sm font-semibold text-muted-foreground">{card.title}</h3>
            <p
              className="mt-2 text-[clamp(1.75rem,6vw,2rem)] font-bold leading-tight"
              style={{ color: "var(--panel-accent)" }}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PanelPage;
