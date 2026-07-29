import { useState } from "react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { useAuth } from "@/hooks/use-auth";
import { AccountShell } from "@/components/account-shell";
import { supabase } from "@/integrations/selfhosted/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import { Eye, EyeOff } from "lucide-react";

export default function AlterarSenha() {
  usePageMeta("Alterar senha — JH7 Gestão Fotográfica", "Defina uma nova senha de acesso.");
  const { user } = useAuth();

  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [saving, setSaving] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();

    if (nova.length < 8) {
      notifyValidation("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (nova !== confirma) {
      notifyValidation("A confirmação não confere com a nova senha.");
      return;
    }

    setSaving(true);

    // Reautentica com a senha atual antes de trocar (evita troca indevida
    // caso a sessão fique aberta em um dispositivo compartilhado).
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: (user?.email ?? "").trim().toLowerCase(),
      password: atual,
    });

    if (authError) {
      setSaving(false);
      notifyError(authError, {
        title: "Senha atual incorreta",
        description: "A senha atual informada não confere. Confira e tente novamente.",
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: nova });
    setSaving(false);

    if (error) {
      notifyError(error, { title: "Não foi possível alterar a senha" });
      return;
    }

    setAtual("");
    setNova("");
    setConfirma("");
    notifySuccess("Sua senha foi alterada com sucesso.", "Senha atualizada");
  }

  return (
    <AccountShell title="Alterar senha" subtitle="Escolha uma nova senha para acessar o sistema.">
      <form
        onSubmit={salvar}
        className="space-y-5 rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="atual">Senha atual</Label>
          <Input
            id="atual"
            type={mostrar ? "text" : "password"}
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="nova">Nova senha</Label>
          <div className="flex gap-2">
            <Input
              id="nova"
              type={mostrar ? "text" : "password"}
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              autoComplete="new-password"
              required
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="tap-target shrink-0"
              aria-label={mostrar ? "Ocultar senhas" : "Mostrar senhas"}
              onClick={() => setMostrar((v) => !v)}
            >
              {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="confirma">Confirmar nova senha</Label>
          <Input
            id="confirma"
            type={mostrar ? "text" : "password"}
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? "Alterando..." : "Alterar senha"}
        </Button>
      </form>
    </AccountShell>
  );
}
