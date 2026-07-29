import { Check, Sparkles } from "lucide-react";

import {
  CUSTOM_PALETTE_ID,
  PALETTES,
  normalizeHex,
  paletteColors,
  paletteSwatches,
  type CustomColors,
} from "@/lib/palettes";
import { cn } from "@/lib/utils";

interface PaletteGridProps {
  value: string;
  custom: CustomColors;
  onChange: (id: string) => void;
  onCustomChange: (colors: CustomColors) => void;
}

const FIELDS: { key: keyof CustomColors; label: string; help: string }[] = [
  { key: "primary", label: "Primária", help: "Botões, links e foco" },
  { key: "secondary", label: "Secundária", help: "Ações positivas" },
  { key: "accent", label: "Destaque", help: "Realces e gráficos" },
];

function Swatches({ colors }: { colors: CustomColors }) {
  return (
    <span className="flex shrink-0 items-center -space-x-2">
      {paletteSwatches(colors).map((color, index) => (
        <span
          key={`${color}-${index}`}
          className="h-7 w-7 rounded-full border border-black/15 shadow-sm"
          style={{ background: color, zIndex: 3 - index }}
        />
      ))}
    </span>
  );
}

/** Grade de templates de cores + editor de cores personalizadas. */
export function PaletteGrid({ value, custom, onChange, onCustomChange }: PaletteGridProps) {
  const isCustomSelected = value === CUSTOM_PALETTE_ID;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PALETTES.map((palette) => {
          const selected = palette.id === value;
          return (
            <button
              key={palette.id}
              type="button"
              onClick={() => onChange(palette.id)}
              aria-pressed={selected}
              className={cn(
                "tap-target flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                selected
                  ? "border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]"
                  : "border-border bg-surface hover:border-[var(--primary)]",
              )}
            >
              <Swatches colors={paletteColors(palette.id)} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{palette.name}</span>
              {selected ? (
                <Check className="h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} />
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "rounded-xl border p-4 transition-colors",
          isCustomSelected
            ? "border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_8%,transparent)]"
            : "border-border bg-surface",
        )}
      >
        <button
          type="button"
          onClick={() => onChange(CUSTOM_PALETTE_ID)}
          aria-pressed={isCustomSelected}
          className="tap-target flex w-full items-center gap-3 text-left"
        >
          <Swatches colors={custom} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4" style={{ color: "var(--primary)" }} />
              Personalizada
            </span>
            <span className="block text-xs text-muted-foreground">
              Defina cada cor manualmente
            </span>
          </span>
          {isCustomSelected ? (
            <Check className="h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} />
          ) : null}
        </button>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {FIELDS.map(({ key, label, help }) => (
            <label key={key} className="flex items-center gap-3 rounded-lg border border-border bg-card p-2">
              <input
                type="color"
                value={custom[key]}
                onChange={(event) => {
                  onCustomChange({ ...custom, [key]: event.target.value });
                  if (!isCustomSelected) onChange(CUSTOM_PALETTE_ID);
                }}
                className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-border bg-transparent p-0"
                aria-label={`Cor ${label}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">{label}</span>
                <input
                  type="text"
                  value={custom[key]}
                  onChange={(event) => onCustomChange({ ...custom, [key]: event.target.value })}
                  onBlur={(event) =>
                    onCustomChange({
                      ...custom,
                      [key]: normalizeHex(event.target.value, custom[key]),
                    })
                  }
                  className="w-full bg-transparent text-xs uppercase tabular-nums text-muted-foreground outline-none"
                  aria-label={`Código hexadecimal da cor ${label}`}
                />
                <span className="sr-only">{help}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
