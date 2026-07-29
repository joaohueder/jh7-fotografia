import { Navigate, useLocation } from "react-router-dom";
import { Loader2, LockKeyhole } from "lucide-react";

import { useAcesso } from "@/hooks/use-acesso";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const ROTA_NOVA_ASSINATURA = "/assinatura";

/**
 * Regra de assinatura:
 *  - sa_admin nunca é bloqueado;
 *  - admin da empresa sem assinatura ativa fica preso na tela de nova assinatura;
 *  - usuário comum recebe o aviso para procurar o administrador da empresa.
 */
export function AssinaturaGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useAcesso();
  const { signOut } = useAuth();
  const location = useLocation();

  if (isLoading || !data) {
    return <div className="min-h-dvh bg-background" />;
  }

  if (data.role === "sa_admin" || data.assinatura_ativa) {
    return <>{children}</>;
  }

  if (data.role === "admin") {
    if (location.pathname === ROTA_NOVA_ASSINATURA) return <>{children}</>;
    return <Navigate to={ROTA_NOVA_ASSINATURA} replace />;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-[var(--gutter)]">
      <div className="glass w-full max-w-[30rem] rounded-3xl p-8 text-center animate-fade-up">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-border bg-surface">
          <LockKeyhole className="h-5 w-5 text-gold" />
        </span>
        <h1 className="mt-5 text-xl">Empresa sem assinatura ativa</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          A sua empresa está sem uma assinatura ativa no momento. Entre em contato com o
          administrador da empresa para regularizar o plano e liberar o acesso ao sistema.
        </p>
        <Button className="mt-7 h-11 w-full rounded-xl" onClick={() => void signOut()}>
          Sair
        </Button>
      </div>
    </div>
  );
}

/** Evita que o admin com assinatura ativa fique na tela de contratação. */
export function RedirectSeAssinaturaAtiva({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useAcesso();

  if (isLoading || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  if (data.role === "sa_admin" || data.assinatura_ativa) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
