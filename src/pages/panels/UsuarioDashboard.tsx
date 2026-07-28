import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { PanelPage } from "@/components/panel-page";

const CARDS = [
  { title: "Minhas sessões", value: "0" },
  { title: "Tarefas pendentes", value: "0" },
  { title: "Entregas do mês", value: "0" },
];

export default function UsuarioDashboard() {
  usePageMeta("Painel do Usuário — JH7 Gestão Fotográfica", "Suas sessões e tarefas do dia.");

  return (
    <PanelLayout accent="usuario" menu={[{ label: "Dashboard", to: "/usuario/dashboard" }]}>
      <PanelPage title="Dashboard" subtitle="Suas sessões e tarefas do dia." stats={CARDS} />
    </PanelLayout>
  );
}
