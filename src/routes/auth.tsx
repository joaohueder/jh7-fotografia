import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Camera, Eye, EyeOff, Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — JH7 Gestão Fotográfica" },
      { name: "description", content: "Acesse sua conta do JH7 Gestão Fotográfica." },
      { property: "og:title", content: "Entrar — JH7 Gestão Fotográfica" },
      { property: "og:description", content: "Acesse sua conta do JH7 Gestão Fotográfica." },
    ],
  }),
  component: AuthPage,
});

const HIGHLIGHTS = [
  "Agenda unificada de ensaios e eventos",
  "Clientes, contratos e pagamentos sob controle",
  "Galerias e entregas organizadas por projeto",
  "Visão financeira do seu negócio fotográfico",
];

function AuthPage() {
  const { user, isLoading, signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    const savedEmail = localStorage.getItem("auth_email");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError("Preencha e-mail e senha.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      setFormError("E-mail ou senha inválidos.");
      return;
    }

    if (rememberMe) {
      localStorage.setItem("auth_email", email);
    } else {
      localStorage.removeItem("auth_email");
    }

    navigate({ to: "/dashboard", replace: true });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient light */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--gradient-halo)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 bottom-[-12rem] h-[32rem] w-[32rem] rounded-full opacity-[0.07] blur-3xl"
        style={{ background: "var(--gradient-gold)" }}
      />

      <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left — brand narrative */}
        <section className="relative order-2 hidden flex-col justify-between gap-10 px-6 pb-12 pt-4 sm:px-10 lg:flex lg:order-1 lg:gap-16 lg:px-16 lg:py-16">
          <header className="order-first flex min-w-0 items-center gap-3 animate-fade-in">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface">
              <Camera className="h-[18px] w-[18px] text-gold" />
            </span>
            <span className="truncate text-sm font-medium tracking-[0.14em] uppercase text-muted-foreground">
              JH7 <span className="text-foreground">Gestão Fotográfica</span>
            </span>
          </header>

          <div className="max-w-xl stagger">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gold">
              Plataforma para estúdios
            </p>

            <h1 className="mt-6 text-[clamp(2.5rem,5vw,3.75rem)] leading-[1.05]">
              Gerencie seu estúdio
              <br />
              com <span className="text-gradient-gold">clareza</span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-[1.7] text-foreground/70">
              Sessões, clientes, contratos e entregas em um único fluxo — pensado
              para fotógrafos que tratam o próprio negócio com o mesmo cuidado
              que tratam a luz.
            </p>


            <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border/60">
              {HIGHLIGHTS.map((item) => (
                <li
                  key={item}
                  className="group flex items-center gap-4 bg-surface/70 px-5 py-4 text-sm text-foreground/85 transition-colors duration-300 hover:bg-surface-elevated"
                >
                  <span className="h-1 w-6 shrink-0 rounded-full bg-gold/45 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-10 group-hover:bg-gold" />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs tracking-wide text-muted-foreground/70 animate-fade-in">
            © {new Date().getFullYear()} JH7 Gestão Fotográfica
          </p>
        </section>

        {/* Right — sign in */}
        <section className="order-1 flex items-center justify-center px-6 pb-10 pt-10 sm:px-10 lg:order-2 lg:px-16 lg:py-16">
          <div className="w-full max-w-[26rem] space-y-8">
            <div className="flex min-w-0 items-center gap-3 animate-fade-in lg:hidden">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface">
                <Camera className="h-[18px] w-[18px] text-gold" />
              </span>
              <span className="truncate text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
                JH7 <span className="text-foreground">Gestão Fotográfica</span>
              </span>
            </div>

            <div className="glass rounded-3xl p-8 sm:p-10 animate-fade-up">
            <div className="space-y-2">
              <h2 className="text-3xl">Bem-vindo de volta</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Entre com sua conta para acessar o sistema.
              </p>
            </div>

            <form onSubmit={handleEmailSignIn} className="mt-8 space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
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
                  className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
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
                    className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors duration-300 hover:bg-accent hover:text-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="data-[state=checked]:border-gold data-[state=checked]:bg-gold data-[state=checked]:text-primary-foreground"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-[13px] font-normal text-muted-foreground"
                  >
                    Ficar logado por 30 dias
                  </Label>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-[13px] text-muted-foreground transition-colors duration-300 hover:text-gold"
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
                className="group h-12 w-full rounded-xl bg-primary text-[15px] font-medium text-primary-foreground shadow-[var(--shadow-gold)] transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 disabled:opacity-70"
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
    </div>
  );
}
