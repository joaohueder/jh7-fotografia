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
    <AccountShell title="Meu perfil" subtitle="Consulte e atualize os dados da sua conta.">
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
    </AccountShell>
  );
}
