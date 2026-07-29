import type { ReactNode } from "react";

import { PanelLayout, type PanelAccent, type PanelMenuItem } from "@/components/panel-layout";
import { usePrimaryRole } from "@/components/role-routing";
import { SA_MENU } from "@/pages/panels/sa/menu";

/** Menus por painel — a área de conta reaproveita a navegação do painel atual. */
function menuForRole(role: string | null): { accent: PanelAccent; menu: PanelMenuItem[] } {
  switch (role) {
    case "sa_admin":
      return { accent: "sa", menu: SA_MENU };
    case "admin":
      return { accent: "admin", menu: [{ label: "Dashboard", to: "/admin/dashboard" }] };
    default:
      return { accent: "usuario", menu: [{ label: "Dashboard", to: "/usuario/dashboard" }] };
  }
}

/**
 * Casca das páginas da conta (perfil, segurança, senha).
 * Mantém o mesmo layout do painel do usuário logado.
 */
export function AccountShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { role, isLoading } = usePrimaryRole();
  const { accent, menu } = menuForRole(role);

  if (isLoading) return <div className="min-h-dvh bg-background" />;

  return (
    <PanelLayout accent={accent} menu={menu}>
      <div className="mx-auto w-full max-w-[min(42rem,var(--app-max-w))] space-y-[clamp(1.5rem,4vw,2rem)]">
        <header className="space-y-1">
          <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold tracking-tight">{title}</h1>
          <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-muted-foreground">{subtitle}</p>
        </header>
        {children}
      </div>
    </PanelLayout>
  );
}

export default AccountShell;
