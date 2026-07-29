import { useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, KeyRound, LogOut, Menu, ShieldCheck, User, ChevronDown, ArrowLeft } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useImpersonacao } from "@/hooks/use-impersonacao";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export type PanelAccent = "sa" | "admin" | "usuario";

/**
 * Cada painel usa um recorte da paleta do sistema.
 * O acento é sempre da família verde (cor de ação principal da marca):
 * o laranja fica reservado para atenção/pendências e o vermelho para
 * exclusão/bloqueio — nunca para ações primárias.
 */
const ACCENTS: Record<PanelAccent, { accent: string; accentSoft: string; label: string }> = {
  // SA admin — verde da marca
  sa: { accent: "var(--brand-green)", accentSoft: "var(--brand-green-soft)", label: "Painel SaaS" },
  // Admin da empresa — verde da marca
  admin: { accent: "var(--brand-green)", accentSoft: "var(--brand-green-soft)", label: "Painel Administrativo" },
  // Usuário — verde claro da marca (mesma família, tom mais suave)
  usuario: { accent: "var(--brand-green-soft)", accentSoft: "var(--brand-green)", label: "Painel do Usuário" },
};


export interface PanelMenuItem {
  label: string;
  to: string;
  /** Alinha o item à direita na barra de menu superior (desktop). */
  right?: boolean;
  /** Itens do submenu (aparece como lista suspensa no desktop). */
  children?: { label: string; to: string }[];
}



interface PanelLayoutProps {
  accent: PanelAccent;
  menu: PanelMenuItem[];
  children: ReactNode;
}

/**
 * Hierarquia visual (mobile-first):
 *  1. Header fixo    → marca + identidade do painel + sair (sempre visível)
 *  2. Navegação      → drawer (hamburger) < md · barra horizontal fixa >= md
 *  3. Main           → offset calculado por tokens (--app-header-h/--app-nav-h)
 *  4. Rodapé fixo    → reduzido a uma linha em telas estreitas
 *
 * O offset do main usa variáveis CSS fluidas, então nenhuma altura em px
 * fica hardcoded e o conteúdo nunca fica escondido atrás do chrome fixo.
 */
export function PanelLayout({ accent, menu, children }: PanelLayoutProps) {
  const { user, signOut } = useAuth();
  const { fullName, displayName } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = ACCENTS[accent];
  const { empresa, impersonando, encerrar } = useImpersonacao();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const initials = (displayName ?? user?.email ?? "?").slice(0, 2);

  async function handleSignOut() {
    setLogoutOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate("/auth", { replace: true });
  }

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative flex items-center whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors",
      "min-h-[var(--tap)] md:min-h-0 md:py-1.5",
      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
    );

  const navItemStyle = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? {
          background: "color-mix(in oklab, var(--panel-accent) 14%, transparent)",
          color: "var(--panel-accent)",
        }
      : undefined;

  return (
    <div
      className="min-h-dvh bg-background"
      style={
        {
          "--panel-accent": theme.accent,
          "--panel-accent-soft": theme.accentSoft,
          // navegação horizontal só existe a partir de md
          "--panel-nav-h": "0px",
          // faixa de "acessando como empresa" (0 quando não há impersonação)
          "--imp-h": impersonando ? "2rem" : "0px",
        } as React.CSSProperties
      }
    >
      {/* Header fixo — altura fluida via token */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="container-page flex h-[var(--app-header-h)] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {/* Hamburger: apenas < md, alvo de toque de 44px */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Abrir menu de navegação"
                  className="tap-target -ml-2 shrink-0 md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              {/* Overlay ocupa a tela toda no mobile, com scroll interno */}
              <SheetContent
                side="left"
                className="flex w-[min(20rem,85vw)] flex-col gap-6 overflow-y-auto p-6"
              >
                <SheetHeader className="p-0 text-left">
                  <SheetTitle className="text-base">{theme.label}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1">
                  {menu.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end
                      onClick={() => setMobileNavOpen(false)}
                      className={navItemClass}
                      style={navItemStyle}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>


                {user?.email ? (
                  <div className="mt-auto space-y-0.5">
                    <p className="truncate text-sm font-semibold">{fullName ?? displayName ?? "—"}</p>
                    <p className="break-all text-xs text-muted-foreground">{user.email}</p>
                  </div>
                ) : null}
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface"
                style={{ color: "var(--panel-accent)" }}
              >
                <Camera className="h-[1.125rem] w-[1.125rem]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[clamp(0.8125rem,2.6vw,0.875rem)] font-bold">
                  JH7 Gestão Fotográfica
                </span>
                <span
                  className="block truncate text-[0.6875rem] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: "var(--panel-accent)" }}
                >
                  {theme.label}
                </span>
              </span>
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {impersonando ? (
              <Button
                variant="outline"
                size="sm"
                className="tap-target gap-2 px-2 sm:px-3"
                onClick={() => {
                  encerrar();
                  queryClient.clear();
                  navigate("/sa/empresas", { replace: true });
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Voltar ao painel SA</span>
              </Button>
            ) : null}

            <ThemeToggle />

            {/* Menu da conta — avatar/iniciais no mobile, e-mail a partir de lg */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Abrir menu da conta"
                  className="tap-target gap-2 px-2 sm:px-3"
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-surface text-[0.6875rem] font-bold uppercase"
                    style={{ color: "var(--panel-accent)" }}
                  >
                    {initials}
                  </span>
                  <span className="hidden max-w-[11rem] truncate text-sm text-muted-foreground lg:inline">
                    {displayName ?? "—"}
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="space-y-0.5">
                  <span className="block text-xs font-normal text-muted-foreground">
                    Conectado como
                  </span>
                  <span className="block truncate text-sm font-semibold">
                    {fullName ?? displayName ?? "—"}
                  </span>
                  <span className="block break-all text-xs font-normal text-muted-foreground">
                    {user?.email ?? "—"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => navigate("/conta/perfil")}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate("/conta/seguranca")}
                  className="cursor-pointer"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Segurança
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate("/conta/senha")}
                  className="cursor-pointer"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Alterar senha
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setLogoutOpen(true)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sair do sistema?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você será desconectado e precisará fazer login novamente para acessar o JH7 Gestão
                    Fotográfica.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setLogoutOpen(false)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSignOut}>Sair</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

        </div>
      </header>

      {impersonando && empresa ? (
        <div
          className="fixed inset-x-0 top-[var(--app-header-h)] z-40 border-b border-border"
          style={{ background: "color-mix(in oklab, var(--panel-accent) 14%, var(--background))" }}
        >
          <div className="container-page flex h-8 items-center gap-2 overflow-hidden text-xs font-semibold">
            <span className="truncate" style={{ color: "var(--panel-accent)" }}>
              Visualizando como administrador de {empresa.nome}
            </span>
          </div>
        </div>
      ) : null}

      {/* Menu superior fixo — somente >= md (no mobile vive no drawer) */}
      <nav
        className="fixed inset-x-0 top-[calc(var(--app-header-h)+var(--imp-h))] z-30 hidden border-b border-border bg-surface/80 backdrop-blur md:block"
        style={{ "--panel-nav-h": "var(--app-nav-h)" } as React.CSSProperties}
      >
        <div className="container-page flex h-[var(--app-nav-h)] items-center gap-1 overflow-x-auto">
          {menu.map((item) =>
            item.children?.length ? (
              <DropdownMenu key={item.to}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      navItemClass({
                        isActive: item.children.some((c) =>
                          window.location.pathname.startsWith(c.to),
                        ),
                      }),
                      "gap-1",
                      item.right && "ml-auto",
                    )}
                  >
                    {item.label}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {item.children.map((sub) => (
                    <DropdownMenuItem
                      key={sub.to}
                      className="cursor-pointer"
                      onSelect={() => navigate(sub.to)}
                    >
                      {sub.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) => cn(navItemClass({ isActive }), item.right && "ml-auto")}
                style={navItemStyle}
              >
                {item.label}
              </NavLink>
            ),
          )}

        </div>

      </nav>



      {/* Main — offset superior/inferior derivado dos tokens de chrome */}
      <main
        className={cn(
          "container-page",
          "pt-[calc(var(--app-header-h)+var(--imp-h)+var(--gutter))]",
          "md:pt-[calc(var(--app-header-h)+var(--imp-h)+var(--app-nav-h)+var(--gutter))]",
          "pb-[calc(var(--app-footer-h)+var(--gutter)*1.5)]",
        )}
      >
        {children}
      </main>

      {/* Rodapé fixo — a etiqueta do painel some em telas muito estreitas */}
      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur">
        <div className="container-page flex h-[var(--app-footer-h)] items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="truncate">© {new Date().getFullYear()} JH7 Gestão Fotográfica</span>
          <span className="hidden truncate sm:inline" style={{ color: "var(--panel-accent)" }}>
            {theme.label}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default PanelLayout;
