import { Check } from "lucide-react";

import { PALETTES, paletteSwatches } from "@/lib/palettes";
import { cn } from "@/lib/utils";

interface PaletteGridProps {
  value: string;
  onChange: (id: string) => void;
}

/** Grade de templates de cores — troca a paleta em tempo real ao clicar. */
export function PaletteGrid({ value, onChange }: PaletteGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PALETTES.map((palette) => {
        const selected = palette.id === value;
        const swatches = paletteSwatches(palette);

        return (
          <button
            key={palette.id}
            type="button"
            onClick={() => onChange(palette.id)}
            aria-pressed={selected}
            className={cn(
              "tap-target flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
              selected
                ? "border-[var(--panel-accent,var(--primary))] bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]"
                : "border-border bg-surface hover:border-[var(--primary)]",
            )}
          >
            <span className="flex shrink-0 items-center -space-x-2">
              {swatches.map((color, index) => (
                <span
                  key={color}
                  className="h-7 w-7 rounded-full border border-black/20"
                  style={{ background: color, zIndex: 3 - index }}
                />
              ))}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{palette.name}</span>
            {selected ? (
              <Check className="h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
