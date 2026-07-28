import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
      {/* Left column — system explanation */}
      <div className="relative order-1 flex flex-col justify-between bg-primary p-8 text-primary-foreground lg:order-1 lg:p-12">
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-foreground/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>
            <span className="text-lg font-semibold">JH7 Gestão Fotográfica</span>
          </div>
        </div>

        <div className="relative z-10 my-8 max-w-md">
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            Gerencie seu estúdio com clareza
          </h1>
          <p className="mt-4 text-base leading-relaxed opacity-90 lg:text-lg">
            Tudo o que você precisa para organizar sessões, acompanhar clientes,
            controlar agendas e entregar projetos no prazo — em um só lugar.
          </p>

          <ul className="mt-8 space-y-4 text-sm opacity-90">
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-foreground" />
              <span>Agenda unificada de ensaios e eventos</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-foreground" />
              <span>Controle de clientes, contratos e pagamentos</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-foreground" />
              <span>Galerias e entregas organizadas por projeto</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-foreground" />
              <span>Visão financeira do seu negócio fotográfico</span>
            </li>
          </ul>
        </div>

        <div className="relative z-10 text-xs opacity-70">
          © {new Date().getFullYear()} JH7 Gestão Fotográfica. Todos os direitos reservados.
        </div>

        {/* Decorative gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-foreground/5 via-transparent to-black/10" />
      </div>

      {/* Right column — login form */}
      <div className="order-2 flex items-center justify-center p-6 lg:order-2 lg:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h2>
            <p className="text-sm text-muted-foreground">
              Entre com sua conta para acessar o sistema.
            </p>
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@estudio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label htmlFor="remember" className="text-sm font-normal">
                  Ficar logado por 30 dias
                </Label>
              </div>
              <button
                type="button"
                className="text-sm text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  // Password recovery flow will be implemented later.
                }}
              >
                Esqueceu a senha?
              </button>
            </div>

            {formError && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            )}

            <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Acessar o sistema"
              )}
            </Button>
          </form>


          <p className="text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link to="/" className="text-primary underline-offset-4 hover:underline">
              Conheça os planos
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
