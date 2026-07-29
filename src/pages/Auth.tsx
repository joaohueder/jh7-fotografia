import { usePageMeta } from "@/hooks/use-page-meta";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, Camera, Eye, EyeOff, Loader2 } from "lucide-react";

import type { SupabaseClient } from "@supabase/supabase-js";

import { useForcedTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/selfhosted/client";
import { setRememberMe as persistRememberMe } from "@/integrations/selfhosted/auth-storage";
import { notifyError, notifyValidation } from "@/lib/system-message";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function AuthPage() {
  usePageMeta("Entrar — JH7 Gestão Fotográfica", "Acesse sua conta do JH7 Gestão Fotográfica.");
  const { user, isLoading, signIn, signOut } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  // Trava o redirecionamento automático enquanto validamos o acesso (usuário/empresa
  // inativos) — sem isso a tela dava "refresh" indo para /dashboard antes da checagem.
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  useEffect(() => {
    if (!isLoading && user && !isCheckingAccess && !blockMessage) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, isLoading, navigate, isCheckingAccess, blockMessage]);

  useEffect(() => {
    const savedEmail = localStorage.getItem("auth_email");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError("Preencha e-mail e senha.");
      notifyValidation("Preencha o e-mail e a senha para acessar o sistema.");
      return;
    }

    setIsSubmitting(true);
    setIsCheckingAccess(true);
    // Define onde a sessão será gravada ANTES do login:
    // marcado → localStorage por 30 dias; desmarcado → só enquanto a aba estiver aberta.
    persistRememberMe(rememberMe);
    const { error } = await signIn(email, password);

    if (error) {
      setIsSubmitting(false);
      setIsCheckingAccess(false);
      setFormError("E-mail ou senha inválidos.");
      notifyError(error, {
        title: "Não foi possível entrar",
        description:
          "E-mail ou senha inválidos. Confira os dados digitados e tente novamente. Se esqueceu a senha, fale com o administrador.",
      });
      return;
    }

    // Bloqueia acesso de usuário ou empresa inativos
    const { data: acesso } = await (supabase as unknown as SupabaseClient).rpc("meu_acesso");
    const liberado = (acesso as { ativo?: boolean } | null)?.ativo ?? true;
    if (!liberado) {
      setBlockMessage(
        (acesso as { motivo?: string } | null)?.motivo ??
          "Acesso bloqueado. Fale com o administrador.",
      );
      await signOut();
      setIsSubmitting(false);
      setIsCheckingAccess(false);
      setPassword("");
      return;
    }

    setIsSubmitting(false);
    setIsCheckingAccess(false);

    if (rememberMe) {
      localStorage.setItem("auth_email", email);
    } else {
      localStorage.removeItem("auth_email");
    }

    navigate("/dashboard", { replace: true });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  /*
   * Hierarquia visual:
   *  - Mobile/tablet: coluna única, cartão de login centrado e legível (max 26rem),
   *    narrativa da marca oculta para não empurrar o formulário abaixo da dobra.
   *  - Desktop (lg+): grid bidimensional 2 colunas — narrativa | formulário.
   *  Fundo decorativo é `fixed` e `pointer-events-none`: cobre a viewport inteira
   *  sem participar do fluxo nem gerar scroll horizontal.
   */
  return (
    <div className="relative min-h-dvh bg-background">
      {/* Ambient light — cobre toda a viewport, além do container de 1200px */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "var(--gradient-halo)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-[-8rem] right-[-8rem] z-0 h-[min(32rem,70vw)] w-[min(32rem,70vw)] rounded-full opacity-[0.07] blur-3xl"
        style={{ background: "var(--gradient-gold)" }}
      />

      <div className="relative z-10 grid min-h-dvh grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left — brand narrative (somente desktop)
            Ritmo vertical: marca › narrativa › provas › rodapé.
            A lista deixou de ser um bloco único pesado: agora são cartões
            translúcidos independentes, com marcador numerado e hover sutil. */}
        <section className="relative order-2 hidden flex-col justify-between gap-10 px-[var(--gutter)] pb-12 pt-4 lg:order-1 lg:flex lg:gap-14 lg:py-16 xl:pl-[max(var(--gutter),4rem)]">
          <header className="order-first flex min-w-0 items-center gap-3 animate-fade-in">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface">
              <Camera className="h-[1.125rem] w-[1.125rem] text-gold" />
            </span>
            <span className="truncate text-[0.8125rem] font-bold tracking-[0.16em] uppercase text-muted-foreground">
              JH7 <span className="text-foreground">Gestão Fotográfica</span>
            </span>
          </header>

          <div className="max-w-[34rem] stagger">
            <p className="flex items-center gap-3 text-[0.6875rem] font-bold uppercase tracking-[0.24em] text-gold">
              <span aria-hidden className="h-px w-8 bg-gold/50" />
              Plataforma para estúdios
            </p>

            <h1 className="mt-5 text-[clamp(2.25rem,3.6vw+0.5rem,3.5rem)] leading-[1.03] tracking-[-0.02em]">
              Gerencie seu estúdio
              <br />
              com <span className="text-gradient-gold">clareza</span>
            </h1>

            <p className="mt-5 max-w-[44ch] text-[clamp(0.9375rem,0.35vw+0.85rem,1.0625rem)] leading-[1.65] text-foreground/65">
              Sessões, clientes, contratos e entregas em um único fluxo — pensado para fotógrafos
              que tratam o próprio negócio com o mesmo cuidado que tratam a luz.
            </p>
          </div>

          <div className="flex items-center gap-3 animate-fade-in">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-green" />
            <p className="text-xs tracking-wide text-muted-foreground/70">
              © {new Date().getFullYear()} JH7 Gestão Fotográfica
            </p>
          </div>
        </section>

        {/* Right — sign in */}
        <section className="order-1 flex items-center justify-center px-[var(--gutter)] py-[clamp(1.5rem,6vw,4rem)] lg:order-2">
          <div className="w-full max-w-[26rem] space-y-8">
            <div className="flex min-w-0 items-center gap-3 animate-fade-in lg:hidden">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface">
                <Camera className="h-[1.125rem] w-[1.125rem] text-gold" />
              </span>
              <span className="truncate text-[0.8125rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                JH7 <span className="text-foreground">Gestão Fotográfica</span>
              </span>
            </div>

            <div className="glass rounded-3xl p-[clamp(1.25rem,5vw,2.5rem)] animate-fade-up">
              <div className="space-y-2">
                <h2 className="text-[clamp(1.375rem,4vw,1.75rem)]">Bem-vindo de volta</h2>
                <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">
                  Entre com sua conta para acessar o sistema.
                </p>
              </div>

              <form onSubmit={handleEmailSignIn} className="mt-8 space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/60"
                  >
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="voce@estudio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    className="h-12 rounded-xl border-border bg-background/40 px-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:border-gold/50 focus-visible:bg-background/70"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/60"
                  >
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      className="h-12 rounded-xl border-border bg-background/40 px-4 pr-12 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:border-gold/50 focus-visible:bg-background/70"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="tap-target absolute right-1 top-1/2 grid -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors duration-300 hover:bg-accent hover:text-foreground"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Empilha em telas estreitas; alvos de toque de 44px em ambos */}
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <div className="flex min-h-[var(--tap)] min-w-0 items-center gap-2.5">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                      className="h-5 w-5 data-[state=checked]:border-gold data-[state=checked]:bg-gold data-[state=checked]:text-primary-foreground"
                    />
                    <Label
                      htmlFor="remember"
                      className="cursor-pointer text-[0.8125rem] font-medium leading-snug text-foreground/75"
                    >
                      Ficar logado por 30 dias
                    </Label>
                  </div>
                  <button
                    type="button"
                    className="flex min-h-[var(--tap)] shrink-0 items-center text-[0.8125rem] font-semibold text-muted-foreground transition-colors duration-300 hover:text-gold"
                    onClick={() => {
                      // Password recovery flow will be implemented later.
                    }}
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                {formError && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-fade-up">
                    {formError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="group h-12 w-full rounded-xl bg-primary text-[15px] font-bold tracking-[0.01em] text-primary-foreground shadow-[var(--shadow-gold)] transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      Acessar o sistema
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                Ainda não tem conta?{" "}
                <Link
                  to="/"
                  className="text-gold underline-offset-4 transition-colors duration-300 hover:text-gold-soft hover:underline"
                >
                  Conheça os planos
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>

      <AlertDialog
        open={blockMessage !== null}
        onOpenChange={(open) => !open && setBlockMessage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Acesso bloqueado</AlertDialogTitle>
            <AlertDialogDescription>{blockMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setBlockMessage(null)}>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AuthPage;
