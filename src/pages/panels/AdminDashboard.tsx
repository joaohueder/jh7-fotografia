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
  usePageMeta("Painel Administrativo — JH7 Gestão Fotográfica", "Visão geral do seu estúdio.");

  return (
    <PanelLayout accent="admin" menu={ADMIN_MENU}>
      <PanelPage
        title="Dashboard"
        subtitle="Visão geral do seu estúdio fotográfico."
        stats={CARDS}
        helpTitle="Bem-vindo! Veja por onde começar"
        helpText="Esta é a tela inicial: aqui você acompanha, em poucos números, como está o seu estúdio hoje. Nada é alterado nesta tela — ela apenas mostra informações."
        helpSteps={[
          "Passe o mouse no ícone de interrogação de cada número para entender o que ele significa.",
          "Use o menu no topo para ir até Clientes e cadastrar quem você atende.",
          "Em Configurações você mantém os dados da sua empresa sempre atualizados.",
        ]}
      />
    </PanelLayout>
  );
}
