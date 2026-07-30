import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { PanelPage } from "@/components/panel-page";
import { ADMIN_MENU } from "@/pages/panels/admin/menu";

const CARDS = [
  {
    title: "Sessões agendadas",
    value: "0",
    hint: "Quantidade de ensaios e sessões fotográficas já marcados na agenda.",
  },
  {
    title: "Clientes ativos",
    value: "0",
    hint: "Clientes cadastrados que estão marcados como Ativos no menu Clientes.",
  },
  {
    title: "Equipe da empresa",
    value: "0",
    hint: "Pessoas da sua empresa com acesso ao sistema (fotógrafos, editores, atendimento).",
  },
];

export default function AdminDashboard() {
  usePageMeta("Painel Administrativo — JH7 Gestão de Estúdios Fotográficos", "Visão geral do seu estúdio.");

  return (
    <PanelLayout accent="admin" menu={ADMIN_MENU}>
      <PanelPage
        title="Dashboard"
        subtitle="Visão geral do seu estúdio fotográfico."
        stats={CARDS}
        help="Tela inicial do seu estúdio: mostra apenas informações, nada é alterado aqui. Passe o mouse nos ícones de interrogação para entender cada número e use o menu do topo para ir a Clientes e Configurações."
      />
    </PanelLayout>
  );
}
