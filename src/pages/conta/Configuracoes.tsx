import { Check, Maximize2, Monitor, RotateCcw } from "lucide-react";

import { usePrimaryRole } from "@/components/role-routing";
import { showSystemMessage } from "@/lib/system-message";

import { AccountShell } from "@/components/account-shell";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MAX_MAX_WIDTH, MIN_MAX_WIDTH, useAppLayout } from "@/hooks/use-app-layout";

/** Aba Layout — preferências visuais aplicadas em tempo real. */
function LayoutTab() {
  const { maxWidth, systemDefault, setMaxWidth, resetMaxWidth, saveAsSystemDefault, isDefault, isSaving } =
    useAppLayout();
  const { role } = usePrimaryRole();
  const isSaAdmin = role === "sa_admin";

  async function handleSaveDefault() {
    const { error } = await saveAsSystemDefault();
    showSystemMessage(
      error
        ? {
            variant: "error",
            title: "Não foi possível salvar o padrão",
            description: "A largura padrão do sistema não pôde ser atualizada.",
            error,
          }
        : {
            variant: "success",
            title: "Padrão do sistema atualizado",
            description: `Novos usuários passarão a usar ${maxWidth}px como largura máxima.`,
          },
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
          Largura máxima do sistema
        </h2>

        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Define até onde o conteúdo se estende em telas grandes. O padrão é{" "}
                {DEFAULT_MAX_WIDTH}px.
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
            aria-label="Largura máxima do sistema em pixels"
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
            {isSaAdmin && (
              <Button type="button" onClick={handleSaveDefault} className="tap-target gap-2">
                <Check className="h-4 w-4" />
                Definir como padrão do sistema
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              {isSaving
                ? "Salvando..."
                : "A alteração é aplicada imediatamente e salva na sua conta."}
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}


export default function ConfiguracoesPage() {
  return (
    <AccountShell
      title="Configurações"
      subtitle="Ajuste a aparência e o comportamento do sistema."
      width="full"
    >
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
    </AccountShell>
  );
}
