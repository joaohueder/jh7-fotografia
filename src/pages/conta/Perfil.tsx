import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Maximize2, RotateCcw } from "lucide-react";

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
import { MAX_MAX_WIDTH, MIN_MAX_WIDTH, useAppLayout } from "@/hooks/use-app-layout";
import { notifyError, notifySuccess } from "@/lib/system-message";

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

export default function MeuPerfil() {
  usePageMeta("Meu perfil — JH7 Gestão Fotográfica", "Dados da sua conta.");
  const { user } = useAuth();
  const { role } = usePrimaryRole();

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
    notifySuccess("Seus dados de perfil foram atualizados.", "Perfil atualizado");
  }

  return (
    <AccountShell title="Meu perfil" subtitle="Consulte e atualize os dados da sua conta." width="full">
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

      <LarguraMaximaCard />
    </AccountShell>
  );
}
