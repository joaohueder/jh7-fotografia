import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { PanelPage } from "@/components/panel-page";

const CARDS = [
  { title: "Sessões agendadas", value: "0" },
  { title: "Clientes ativos", value: "0" },
  { title: "Equipe da empresa", value: "0" },
];

export default function AdminDashboard() {
  usePageMeta("Painel Administrativo — JH7 Gestão Fotográfica", "Visão geral do seu estúdio.");

  return (
    <PanelLayout accent="admin" menu={[{ label: "Dashboard", to: "/admin/dashboard" }]}>
      <PanelPage
        title="Dashboard"
        subtitle="Visão geral do seu estúdio fotográfico."
        stats={CARDS}
      />
    </PanelLayout>
  );
}
