import { Navigate } from "react-router-dom";

import { useRoles, type AppRole } from "@/hooks/use-role";

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

/** Papel de maior privilégio do usuário. */
export function usePrimaryRole() {
  const { roles, isLoading } = useRoles();
  const priority: AppRole[] = ["sa_admin", "admin", "usuario"];
  const role = priority.find((r) => roles.includes(r)) ?? null;
  return { role, isLoading };
}

/** Redireciona o usuário para o painel do seu tipo. */
export function RoleRedirect() {
  const { role, isLoading } = usePrimaryRole();
  if (isLoading) return <div className="min-h-screen bg-background" />;
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
  if (isLoading) return <div className="min-h-screen bg-background" />;
  if (!role || !allow.includes(role)) {
    return <Navigate to={panelPathForRole(role)} replace />;
  }
  return <>{children}</>;
}
