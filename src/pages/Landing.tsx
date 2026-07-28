import { usePageMeta } from "@/hooks/use-page-meta";
import { Link } from "react-router-dom";
import { Camera, Calendar, Users, Folder, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Hierarquia visual (mobile-first):
 *  - Header: marca + ações. Em telas estreitas o botão "Entrar" vira o único
 *    CTA textual e "Começar" some (o hero já concentra a conversão).
 *  - Hero: tipografia fluida com clamp(), medida de leitura limitada em ch.
 *  - Features: grid auto-fit — quebra pelo conteúdo (min 15rem por card),
 *    e não por breakpoints de dispositivo, cobrindo dobráveis e tablets landscape.
 */
function LandingPage() {
  usePageMeta(
    "JH7 Gestão Fotográfica — Gestão para Estúdios Fotográficos",
    "JH7 Gestão Fotográfica é o SaaS completo para gestão de estúdios fotográficos e fotógrafos independentes.",
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b">
        <div className="container-page flex h-[var(--app-header-h)] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <Camera className="h-4 w-4" />
            </div>
            <span className="truncate text-[clamp(0.875rem,2.8vw,1rem)] font-semibold">
              JH7 Gestão Fotográfica
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="tap-target">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="tap-target hidden sm:inline-flex">
              <Link to="/auth">Começar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container-page py-[clamp(3rem,10vw,8rem)] text-center">
          <h1 className="mx-auto max-w-[18ch] text-[clamp(2rem,6vw,3.75rem)] font-bold tracking-tight">
            O SaaS para estúdios fotográficos
          </h1>
          <p className="mx-auto mt-6 max-w-[55ch] text-[clamp(1rem,0.6vw+0.9rem,1.125rem)] text-muted-foreground">
            Gerencie sessões, clientes, agendas, entregas e finanças em uma plataforma
            simples e poderosa.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="tap-target w-full sm:w-auto">
              <Link to="/auth">
                Acessar o sistema
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="border-t bg-muted/40">
          <div className="container-page py-[clamp(2.5rem,8vw,5rem)]">
            <div className="grid gap-4 sm:gap-8 [grid-template-columns:repeat(auto-fit,minmax(min(15rem,100%),1fr))]">
              <Feature icon={Calendar} title="Agenda" desc="Controle de ensaios e eventos." />
              <Feature icon={Users} title="Clientes" desc="Cadastro e histórico completo." />
              <Feature icon={Folder} title="Projetos" desc="Galerias e entregas organizadas." />
              <Feature icon={Camera} title="Finanças" desc="Acompanhamento de receitas." />
            </div>
          </div>
        </section>
      </main>

      <footer className="container-page border-t py-6 text-center text-sm text-muted-foreground">
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
    <div className="rounded-xl border bg-card p-[clamp(1rem,3vw,1.5rem)]">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

export default LandingPage;
