import { Navigate } from "react-router-dom";

import { usePrimaryRole } from "@/components/role-routing";

/** Redireciona /configurações para o painel de configurações correspondente ao papel. */
export default function ConfiguracoesRedirect() {
  const { role, isLoading } = usePrimaryRole();

  if (isLoading) {
    return <div className="min-h-dvh bg-background" />;
  }

  if (role === "sa_admin") {
    return <Navigate to="/sa/configuracoes" replace />;
  }

  if (role === "admin") {
    return <Navigate to="/admin/configuracoes" replace />;
  }

  return <Navigate to="/usuario/dashboard" replace />;
}
