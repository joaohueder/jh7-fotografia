import { type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, LogOut } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PanelAccent = "sa" | "admin" | "usuario";

/** Cada painel usa um recorte da paleta do sistema (preto / laranja / verde). */
const ACCENTS: Record<PanelAccent, { accent: string; accentSoft: string; label: string }> = {
  // SA admin — laranja da marca
  sa: { accent: "var(--gold)", accentSoft: "var(--gold-soft)", label: "Painel SaaS" },
  // Admin da empresa — verde da marca
  admin: { accent: "var(--brand-green)", accentSoft: "var(--brand-green-soft)", label: "Painel Administrativo" },
  // Usuário — laranja suave / âmbar claro derivado da paleta
  usuario: { accent: "var(--gold-soft)", accentSoft: "var(--brand-green-soft)", label: "Painel do Usuário" },
};

export interface PanelMenuItem {
  label: string;
  to: string;
}

interface PanelLayoutProps {
  accent: PanelAccent;
  menu: PanelMenuItem[];
  children: ReactNode;
}

export function PanelLayout({ accent, menu, children }: PanelLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = ACCENTS[accent];

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate("/auth", { replace: true });
  }

  return (
    <div
      className="min-h-screen bg-background"
      style={
        {
          "--panel-accent": theme.accent,
          "--panel-accent-soft": theme.accentSoft,
        } as React.CSSProperties
      }
    >
      {/* Header fixo */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface"
              style={{ color: "var(--panel-accent)" }}
            >
              <Camera className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">JH7 Gestão Fotográfica</span>
              <span
                className="block truncate text-[11px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: "var(--panel-accent)" }}
              >
                {theme.label}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden max-w-[180px] truncate text-sm text-muted-foreground sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Menu superior fixo */}
      <nav className="fixed inset-x-0 top-16 z-30 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1200px] items-center gap-1 overflow-x-auto px-6">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                cn(
                  "relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
                      color: "var(--panel-accent)",
                    }
                  : undefined
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main */}
      <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-32">{children}</main>

      {/* Rodapé fixo */}
      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[1200px] items-center justify-between gap-4 px-6 text-xs text-muted-foreground">
          <span className="truncate">© {new Date().getFullYear()} JH7 Gestão Fotográfica</span>
          <span className="truncate" style={{ color: "var(--panel-accent)" }}>
            {theme.label}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default PanelLayout;
