import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { Maximize2, Monitor, Moon, Palette as PaletteIcon, RotateCcw, Sun, UserRound } from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { useAuth } from "@/hooks/use-auth";
import { usePrimaryRole } from "@/components/role-routing";
import { ROLE_LABELS } from "@/hooks/use-role";
import { AccountShell } from "@/components/account-shell";
import { supabase } from "@/integrations/selfhosted/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MAX_MAX_WIDTH, MIN_MAX_WIDTH, useAppLayout } from "@/hooks/use-app-layout";
import { notifyError, notifySuccess } from "@/lib/system-message";
import { useTheme } from "@/hooks/use-theme";
import { usePalette } from "@/hooks/use-palette";
import { PaletteGrid } from "@/components/palette-grid";
import { paletteName } from "@/lib/palettes";
import { cn } from "@/lib/utils";

const db = supabase as unknown as SupabaseClient;

/** Preferência individual de largura máxima da tela. */
function LarguraMaximaCard() {
  const { maxWidth, systemDefault, setMaxWidth, resetMaxWidth, isDefault, isSaving } = useAppLayout();

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
          <Maximize2 className="h-4 w-4" />
        </span>
        Largura máxima da tela
      </h2>

      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Define até onde o conteúdo se estende em telas grandes. O padrão do sistema é {systemDefault}px.
          </p>
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
  );
}


/** Preferência individual de tema (claro/escuro). */
function TemaCard() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light" as const, label: "Claro", icon: Sun },
    { value: "dark" as const, label: "Escuro", icon: Moon },
  ];

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
          <Sun className="h-4 w-4" />
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
  );
}

/** Paleta de cores individual do usuário. */
function TemplatesCard() {
  const { paletteId, systemPalette, customColors, savePalette, setCustomColors, resetPalette, isDefault } =
    usePalette();
  const [pending, setPending] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function confirmar() {
    if (!pending) return;
    setSalvando(true);
    const { error } = await savePalette(pending);
    setSalvando(false);
    const nome = paletteName(pending);
    setPending(null);
    if (error) {
      notifyError(error, { title: "Não foi possível salvar a paleta" });
      return;
    }
    notifySuccess(`A paleta ${nome} foi salva no seu perfil.`, "Paleta aplicada");
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
        Escolha a paleta de cores da sua conta — altera apenas as cores primária, secundária e de
        destaque. O padrão do sistema é {paletteName(systemPalette)}.
      </p>

      <PaletteGrid
        value={paletteId}
        custom={customColors}
        onChange={(id) => setPending(id)}
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

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aplicar a paleta {pending ? paletteName(pending) : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              As cores do sistema mudam imediatamente e a escolha fica salva no seu perfil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmar();
              }}
              disabled={salvando}
            >
              {salvando ? "Salvando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}


export default function MeuPerfil() {
  usePageMeta("Meu perfil — JH7 Gestão Fotográfica", "Dados da sua conta.");
  const { user } = useAuth();
  const { role } = usePrimaryRole();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!user?.id) return;

    db.from("profiles")
      .select("full_name, display_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        setFullName(data?.full_name ?? (user.user_metadata?.full_name as string) ?? "");
        setDisplayName(data?.display_name ?? "");
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    const { error } = await db
      .from("profiles")
      .upsert({ id: user.id, full_name: fullName.trim(), display_name: displayName.trim() });
    setSaving(false);

    if (error) {
      notifyError(error, { title: "Não foi possível salvar o perfil" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    notifySuccess("Seus dados de perfil foram atualizados.", "Perfil atualizado");
  }

  return (
    <AccountShell title="Meu perfil" subtitle="Consulte e atualize os dados da sua conta." width="full">
      <Tabs defaultValue="conta" className="space-y-5">
        <TabsList>
          <TabsTrigger value="conta" className="gap-2">
            <UserRound className="h-4 w-4" />
            Dados da Conta
          </TabsTrigger>
          <TabsTrigger value="layout" className="gap-2">
            <Monitor className="h-4 w-4" />
            Layout
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conta" className="mt-0">
          <form onSubmit={salvar} className="space-y-5 rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]">
            <div className="grid gap-1.5">
              <Label>E-mail de acesso</Label>
              <Input value={user?.email ?? ""} disabled />
              <p className="text-xs text-muted-foreground">
                O e-mail de acesso só pode ser alterado pelo administrador.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label>Tipo de usuário</Label>
              <Input value={role ? ROLE_LABELS[role] : "—"} disabled />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
                disabled={loading}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="display_name">Como quer ser chamado</Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Apelido ou primeiro nome"
                disabled={loading}
              />
            </div>

            <Button type="submit" disabled={saving || loading} className="w-full sm:w-auto">
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="layout" className="mt-0">
          <div className="space-y-[clamp(1rem,3vw,1.5rem)]">
            <LarguraMaximaCard />
            <TemaCard />
            <TemplatesCard />
          </div>
        </TabsContent>
      </Tabs>

    </AccountShell>
  );
}
