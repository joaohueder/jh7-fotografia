import { createFileRoute, Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Lumina Studio" },
      { name: "description", content: "Visão geral do seu estúdio fotográfico." },
      { property: "og:title", content: "Dashboard — Lumina Studio" },
      { property: "og:description", content: "Visão geral do seu estúdio fotográfico." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="font-semibold">
            Lumina Studio
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do seu estúdio.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-medium">Sessões agendadas</h3>
              <p className="mt-2 text-3xl font-bold">0</p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-medium">Clientes ativos</h3>
              <p className="mt-2 text-3xl font-bold">0</p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-medium">Projetos em entrega</h3>
              <p className="mt-2 text-3xl font-bold">0</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
