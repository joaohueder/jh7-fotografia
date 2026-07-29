import { Monitor, Moon, Palette, RotateCcw, Sun } from "lucide-react";

import { AccountShell } from "@/components/account-shell";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MAX_MAX_WIDTH, MIN_MAX_WIDTH, useAppLayout } from "@/hooks/use-app-layout";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { usePalette } from "@/hooks/use-palette";
import { PaletteGrid } from "@/components/palette-grid";
import { paletteName } from "@/lib/palettes";

/** Aba Layout — preferências visuais aplicadas em tempo real. */
function LayoutTab() {
  const { maxWidth, systemDefault, setMaxWidth, resetMaxWidth, isDefault, isSaving } = useAppLayout();

  return (
    <div className="space-y-[clamp(1rem,3vw,1.5rem)]">
      <section className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
              color: "var(--panel-accent)",
            }}
          >
            <Monitor className="h-4 w-4" />
          </span>
          Largura máxima da tela
        </h2>

        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Define até onde o conteúdo se estende em telas grandes. O padrão do sistema é{" "}
                {systemDefault}px.
              </p>
            </div>
            <span
              className="rounded-lg border border-border px-3 py-1.5 text-lg font-bold tabular-nums"
              style={{ color: "var(--panel-accent)" }}
            >
              {maxWidth}px
            </span>
          </div>

          <Slider
            value={[maxWidth]}
            min={MIN_MAX_WIDTH}
            max={MAX_MAX_WIDTH}
            step={10}
            aria-label="Largura máxima da tela em pixels"
            onValueChange={(values) => setMaxWidth(values[0])}
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{MIN_MAX_WIDTH}px</span>
            <span>{MAX_MAX_WIDTH}px</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={resetMaxWidth}
              disabled={isDefault}
              className="tap-target gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar padrão ({systemDefault}px)
            </Button>
            <p className="text-xs text-muted-foreground">
              {isSaving ? "Salvando..." : "A alteração é aplicada imediatamente e salva na sua conta."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}


/** Paleta de cores individual do usuário. */
function PaletteSection() {
  const { paletteId, systemPalette, customColors, setPalette, setCustomColors, resetPalette, isDefault } =
    usePalette();

  return (
    <section className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
            color: "var(--panel-accent)",
          }}
        >
          <Palette className="h-4 w-4" />
        </span>
        Paleta de cores
      </h2>

      <p className="mb-5 text-sm text-muted-foreground">
        Escolha o template de cores da sua conta. O padrão do sistema é{" "}
        {paletteName(systemPalette)}.
      </p>

      <PaletteGrid
        value={paletteId}
        custom={customColors}
        onChange={setPalette}
        onCustomChange={setCustomColors}
      />

      <div className="mt-5">
        <Button
          type="button"
          variant="outline"
          onClick={resetPalette}
          disabled={isDefault}
          className="tap-target gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Usar padrão do sistema ({paletteName(systemPalette)})
        </Button>
      </div>
    </section>
  );
}

/** Aba Tema — preferência claro/escuro. */
function ThemeTab() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light" as const, label: "Claro", icon: Sun },
    { value: "dark" as const, label: "Escuro", icon: Moon },
  ];

  return (
    <div className="space-y-[clamp(1rem,3vw,1.5rem)]">
      <section className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
              color: "var(--panel-accent)",
            }}
          >
            <Palette className="h-4 w-4" />
          </span>
          Aparência
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {options.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                theme === value
                  ? "border-[var(--panel-accent)] bg-[color-mix(in_oklab,var(--panel-accent)_10%,transparent)]"
                  : "border-border bg-surface hover:border-[var(--panel-accent)]",
              )}
            >
              <Icon className="h-5 w-5" style={{ color: "var(--panel-accent)" }} />
              <span className="font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <PaletteSection />
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <AccountShell
      title="Configurações"
      subtitle="Ajuste a aparência e o comportamento do sistema para a sua conta."
      width="full"
    >
      <Tabs defaultValue="layout" className="space-y-5">
        <TabsList>
          <TabsTrigger value="layout" className="gap-2">
            <Monitor className="h-4 w-4" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-2">
            <Palette className="h-4 w-4" />
            Tema
          </TabsTrigger>
        </TabsList>
        <TabsContent value="layout" className="mt-0">
          <LayoutTab />
        </TabsContent>
        <TabsContent value="theme" className="mt-0">
          <ThemeTab />
        </TabsContent>
      </Tabs>
    </AccountShell>
  );
}
