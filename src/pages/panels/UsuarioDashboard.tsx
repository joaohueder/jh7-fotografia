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
  usePageMeta("Painel do Usuário — JH7 Gestão de Estúdios Fotográficos", "Suas sessões e tarefas do dia.");

  return (
    <PanelLayout accent="usuario" menu={[{ label: "Dashboard", to: "/usuario/dashboard" }]}>
      <PanelPage
        title="Dashboard"
        subtitle="Suas sessões e tarefas do dia."
        stats={CARDS}
        help="Seu resumo do dia. A tela só mostra informações, nada é apagado aqui. Passe o mouse nos ícones de interrogação para entender cada número; se precisar de algo que não aparece, fale com o administrador da empresa."
      />
    </PanelLayout>
  );
}
