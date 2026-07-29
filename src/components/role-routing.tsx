import { Navigate } from "react-router-dom";

import { useRoles, type AppRole } from "@/hooks/use-role";
import { useImpersonacao } from "@/hooks/use-impersonacao";

export function panelPathForRole(role: AppRole | null) {
  switch (role) {
    case "sa_admin":
      return "/sa/dashboard";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/usuario/dashboard";
  }
}

/**
 * Papel de maior privilégio do usuário.
 * Durante o "acessar como empresa", o sa_admin passa a ser tratado como admin
 * da empresa em todo o app (menus, módulos e redirecionamentos).
 */
export function usePrimaryRole() {
  const { roles, isLoading } = useRoles();
  const { impersonando } = useImpersonacao();
  const priority: AppRole[] = ["sa_admin", "admin", "usuario"];
  const real = priority.find((r) => roles.includes(r)) ?? null;
  const role: AppRole | null = impersonando && real === "sa_admin" ? "admin" : real;
  return { role, realRole: real, isLoading };
}

/** Redireciona o usuário para o painel do seu tipo. */
export function RoleRedirect() {
  const { role, isLoading } = usePrimaryRole();
  if (isLoading) return <div className="min-h-dvh bg-background" />;
  return <Navigate to={panelPathForRole(role)} replace />;
}

/** Protege um painel: só o(s) papel(is) permitido(s) entram. */
export function RequireRole({
  allow,
  children,
}: {
  allow: AppRole[];
  children: React.ReactNode;
}) {
  const { role, isLoading } = usePrimaryRole();
  const { impersonando } = useImpersonacao();
  if (isLoading) return <div className="min-h-dvh bg-background" />;
  // SA admin "acessando como empresa" enxerga o painel do administrador.
  if (impersonando && role === "sa_admin" && allow.includes("admin")) {
    return <>{children}</>;
  }
  if (!role) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-[var(--gutter)] text-center">
        <p className="max-w-md text-muted-foreground">
          Sua conta ainda não possui um tipo de acesso definido. Fale com o administrador.
        </p>
      </div>
    );
  }
  if (!allow.includes(role)) {
    return <Navigate to={panelPathForRole(role)} replace />;
  }
  return <>{children}</>;
}
