import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { PanelPage } from "@/components/panel-page";

const CARDS = [
  { title: "Empresas ativas", value: "0" },
  { title: "Usuários no SaaS", value: "0" },
  { title: "Assinaturas em dia", value: "0" },
];

export default function SaDashboard() {
  usePageMeta("Painel SaaS — JH7 Gestão Fotográfica", "Visão geral da operação do SaaS.");

  return (
    <PanelLayout accent="sa" menu={[{ label: "Dashboard", to: "/sa/dashboard" }]}>
      <PanelPage title="Dashboard" subtitle="Visão geral da operação do SaaS." stats={CARDS} />
    </PanelLayout>
  );
}
