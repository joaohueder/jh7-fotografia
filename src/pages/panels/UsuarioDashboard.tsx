import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";

const CARDS = [
  { title: "Minhas sessões", value: "0" },
  { title: "Tarefas pendentes", value: "0" },
  { title: "Entregas do mês", value: "0" },
];

export default function UsuarioDashboard() {
  usePageMeta("Painel do Usuário — JH7 Gestão Fotográfica", "Suas sessões e tarefas do dia.");

  return (
    <PanelLayout accent="usuario" menu={[{ label: "Dashboard", to: "/usuario/dashboard" }]}>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Suas sessões e tarefas do dia.</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <div key={card.title} className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-muted-foreground">{card.title}</h3>
              <p className="mt-2 text-3xl font-bold" style={{ color: "var(--panel-accent)" }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </PanelLayout>
  );
}
