import { usePageMeta } from "@/hooks/use-page-meta";
import { PanelLayout } from "@/components/panel-layout";
import { PanelPage } from "@/components/panel-page";

const CARDS = [
  {
    title: "Minhas sessões",
    value: "0",
    hint: "Ensaios e trabalhos fotográficos atribuídos a você.",
  },
  {
    title: "Tarefas pendentes",
    value: "0",
    hint: "Atividades que ainda precisam ser concluídas por você.",
  },
  {
    title: "Entregas do mês",
    value: "0",
    hint: "Trabalhos finalizados e entregues ao cliente neste mês.",
  },
];

export default function UsuarioDashboard() {
  usePageMeta("Painel do Usuário — JH7 Gestão Fotográfica", "Suas sessões e tarefas do dia.");

  return (
    <PanelLayout accent="usuario" menu={[{ label: "Dashboard", to: "/usuario/dashboard" }]}>
      <PanelPage
        title="Dashboard"
        subtitle="Suas sessões e tarefas do dia."
        stats={CARDS}
        helpTitle="O que você encontra aqui"
        helpText="Esta tela é o seu resumo do dia. Ela só mostra informações — você não corre risco de apagar nada por aqui."
        helpSteps={[
          "Confira os números do topo para saber o que precisa da sua atenção hoje.",
          "Passe o mouse no ícone de interrogação para entender cada número.",
          "Precisa de algo que não aparece aqui? Fale com o administrador da sua empresa.",
        ]}
      />
    </PanelLayout>
  );
}
