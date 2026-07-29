import { Check, Maximize2, Monitor, Palette as PaletteIcon, RotateCcw } from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { notifyError, notifySuccess } from "@/lib/system-message";
import { PanelLayout } from "@/components/panel-layout";
import { SA_MENU } from "@/pages/panels/sa/menu";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MAX_MAX_WIDTH, MIN_MAX_WIDTH, useAppLayout } from "@/hooks/use-app-layout";
import { usePalette } from "@/hooks/use-palette";
import { PaletteGrid } from "@/components/palette-grid";
import { paletteName, type CustomColors } from "@/lib/palettes";


/** Grupo Templates — paleta de cores padrão do sistema. */
function TemplatesSection() {
  const { systemPalette, systemCustomColors, customColors, saveAsSystemPalette } = usePalette();

  async function apply(id: string, colors?: CustomColors) {
    const { error } = await saveAsSystemPalette(id, colors);
    if (error) {
      notifyError(error, { title: "Não foi possível salvar a paleta padrão" });
      return;
    }
    notifySuccess(
      `A paleta ${paletteName(id)} passa a ser o padrão para todos os usuários que não escolheram uma paleta própria.`,
      "Template aplicado",
    );
  }

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
          <PaletteIcon className="h-4 w-4" />
        </span>
        Templates
      </h2>

      <p className="mb-5 text-sm text-muted-foreground">
        Escolha a paleta padrão do sistema — altera apenas as cores primária, secundária e de
        destaque. Cada usuário pode definir a própria paleta nas configurações da conta.
      </p>

      <PaletteGrid
        value={systemPalette}
        custom={systemCustomColors ?? customColors}
        onChange={(id) => void apply(id)}
        onCustomChange={(colors) => void apply("custom", colors)}
      />
    </section>
  );
}

/** Aba Layout — padrão global da largura máxima. */
function LayoutTab() {
  const {
    maxWidth,
    systemDefault,
    setMaxWidth,
    resetMaxWidth,
    saveAsSystemDefault,
    isDefault,
    isSaving,
  } = useAppLayout();

  async function handleSaveDefault() {
    const { error } = await saveAsSystemDefault();
    if (error) {
      notifyError(error, { title: "Não foi possível salvar o padrão do sistema" });
      return;
    }
    notifySuccess(
      `Novos usuários passarão a usar ${maxWidth}px como largura máxima.`,
      "Padrão do sistema atualizado",
    );
  }

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
            <Maximize2 className="h-4 w-4" />
          </span>
          Largura máxima padrão do sistema
        </h2>

        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Define o valor padrão da largura máxima para novos usuários. Usuários já existentes
                não são afetados.
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
            aria-label="Largura máxima padrão do sistema em pixels"
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
            <Button type="button" onClick={handleSaveDefault} className="tap-target gap-2">
              <Check className="h-4 w-4" />
              Definir como padrão do sistema
            </Button>
            <p className="text-xs text-muted-foreground">{isSaving ? "Salvando..." : ""}</p>
          </div>
        </div>
      </section>

      <TemplatesSection />
    </div>
  );
}

export default function SaConfiguracoes() {
  usePageMeta("Configurações do sistema — JH7 Gestão Fotográfica", "Padrões globais do SaaS.");

  return (
    <PanelLayout accent="sa" menu={SA_MENU}>
      <div className="w-full space-y-[clamp(1.5rem,4vw,2rem)]">
        <header className="space-y-1">
          <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">
            Configurações do sistema
          </h1>
          <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">
            Padrões globais aplicados a novos usuários.
          </p>
        </header>

        <Tabs defaultValue="layout" className="space-y-5">
          <TabsList>
            <TabsTrigger value="layout" className="gap-2">
              <Monitor className="h-4 w-4" />
              Layout
            </TabsTrigger>
          </TabsList>
          <TabsContent value="layout" className="mt-0">
            <LayoutTab />
          </TabsContent>
        </Tabs>
      </div>
    </PanelLayout>
  );
}


