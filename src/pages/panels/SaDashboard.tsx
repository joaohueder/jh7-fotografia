import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";

const CARDS = [
  { title: "Empresas ativas", value: "0" },
  { title: "Usuários no SaaS", value: "0" },
  { title: "Assinaturas em dia", value: "0" },
];

export default function SaDashboard() {
  usePageMeta("Painel SaaS — JH7 Gestão Fotográfica", "Visão geral da operação do SaaS.");

  return (
    <PanelLayout accent="sa" menu={[{ label: "Dashboard", to: "/sa/dashboard" }]}>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da operação do SaaS.</p>
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
