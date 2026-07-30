import { useNavigate } from "react-router-dom";
import { KeyRound, LogOut, ShieldCheck, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { usePageMeta } from "@/hooks/use-page-meta";
import { useAuth } from "@/hooks/use-auth";
import { AccountShell } from "@/components/account-shell";
import { Button } from "@/components/ui/button";

function formatarData(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

export default function Seguranca() {
  usePageMeta("Segurança — JH7 Gestão de Estúdios Fotográficos", "Sessão e proteção da sua conta.");
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function encerrarSessao() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate("/auth", { replace: true });
  }

  const itens = [
    { label: "E-mail de acesso", value: user?.email ?? "—" },
    { label: "E-mail confirmado", value: user?.email_confirmed_at ? "Sim" : "Não" },
    { label: "Último acesso", value: formatarData(user?.last_sign_in_at) },
    { label: "Conta criada em", value: formatarData(user?.created_at) },
    {
      label: "Sessão expira em",
      value: session?.expires_at
        ? new Date(session.expires_at * 1000).toLocaleString("pt-BR")
        : "—",
    },
  ];

  return (
    <AccountShell title="Segurança" subtitle="Acompanhe o estado da sua conta e da sessão atual." width="full">
      <section className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4" style={{ color: "var(--panel-accent)" }} />
          Informações da conta
        </h2>
        <dl className="mt-4 grid gap-3">
          {itens.map((item) => (
            <div key={item.label} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
              <dt className="text-sm text-muted-foreground">{item.label}</dt>
              <dd className="break-all text-sm font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-card p-[clamp(1rem,3.5vw,1.5rem)]">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4" style={{ color: "var(--panel-accent)" }} />
          Ações de segurança
        </h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => navigate("/conta/senha")} className="justify-start sm:justify-center">
            <KeyRound className="mr-2 h-4 w-4" />
            Alterar senha
          </Button>
          <Button variant="destructive" onClick={encerrarSessao} className="justify-start sm:justify-center">
            <LogOut className="mr-2 h-4 w-4" />
            Encerrar sessão neste dispositivo
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Se você acessou o sistema em um computador compartilhado, encerre a sessão e altere sua senha.
        </p>
      </section>
    </AccountShell>
  );
}
