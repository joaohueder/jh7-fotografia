export const ADMIN_MENU = [
  { label: "Dashboard", to: "/admin/dashboard" },
  {
    label: "Clientes",
    to: "/admin/clientes",
    children: [
      { label: "Clientes", to: "/admin/clientes" },
      { label: "Leads", to: "/admin/leads" },
    ],
  },
  {
    label: "Básico",
    to: "/admin/produtos",
    children: [
      { label: "Produtos", to: "/admin/produtos" },
      { label: "Serviços", to: "/admin/servicos" },
    ],
  },

  { label: "Configurações", to: "/admin/configuracoes", right: true },
];
