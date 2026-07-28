import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Calendar, Users, Folder, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JH7 Gestão Fotográfica — Gestão para Estúdios Fotográficos" },
      {
        name: "description",
        content:
          "JH7 Gestão Fotográfica é o SaaS completo para gestão de estúdios fotográficos e fotógrafos independentes.",
      },
      {
        property: "og:title",
        content: "JH7 Gestão Fotográfica — Gestão para Estúdios Fotográficos",
      },
      {
        property: "og:description",
        content:
          "Organize sessões, clientes, agendas, entregas e finanças em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <Camera className="h-4 w-4" />
            </div>
            <span className="font-semibold">JH7 Gestão Fotográfica</span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Começar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center lg:py-32">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            O SaaS para estúdios fotográficos
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Gerencie sessões, clientes, agendas, entregas e finanças em uma plataforma
            simples e poderosa.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button asChild size="lg">
              <Link to="/auth">
                Acessar o sistema
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="border-t bg-muted/40">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <Feature icon={Calendar} title="Agenda" desc="Controle de ensaios e eventos." />
              <Feature icon={Users} title="Clientes" desc="Cadastro e histórico completo." />
              <Feature icon={Folder} title="Projetos" desc="Galerias e entregas organizadas." />
              <Feature icon={Camera} title="Finanças" desc="Acompanhamento de receitas." />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} JH7 Gestão Fotográfica. Todos os direitos reservados.
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
