import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { supabase } from "@/integrations/selfhosted/client";
import { SystemMessageDialog } from "@/components/system-message-dialog";
import LandingPage from "@/pages/Landing";
import AuthPage from "@/pages/Auth";
import SaDashboard from "@/pages/panels/SaDashboard";
import EmpresasList from "@/pages/panels/sa/Empresas";
import EmpresaForm from "@/pages/panels/sa/EmpresaForm";
import PlanosList from "@/pages/panels/sa/Planos";
import AssinaturasList from "@/pages/panels/sa/Assinaturas";
import UsuariosList from "@/pages/panels/sa/Usuarios";
import PlanoForm from "@/pages/panels/sa/PlanoForm";
import SaConfiguracoes from "@/pages/panels/sa/Configuracoes";
import AdminDashboard from "@/pages/panels/AdminDashboard";
import AdminConfiguracoes from "@/pages/panels/admin/Configuracoes";
import ClientesList from "@/pages/panels/admin/Clientes";
import ClienteForm from "@/pages/panels/admin/ClienteForm";
import LeadsList from "@/pages/panels/admin/Leads";
import ProdutosList from "@/pages/panels/admin/Produtos";
import ServicosList from "@/pages/panels/admin/Servicos";
import ServicoForm from "@/pages/panels/admin/ServicoForm";
import GruposServicosList from "@/pages/panels/admin/GruposServicos";
import GrupoServicoForm from "@/pages/panels/admin/GrupoServicoForm";



import UsuarioDashboard from "@/pages/panels/UsuarioDashboard";
import { RoleRedirect, RequireRole } from "@/components/role-routing";
import { AssinaturaGate, RedirectSeAssinaturaAtiva } from "@/components/assinatura-gate";
import NovaAssinaturaPage from "@/pages/panels/admin/NovaAssinatura";

import MeuPerfil from "@/pages/conta/Perfil";
import Seguranca from "@/pages/conta/Seguranca";
import AlterarSenha from "@/pages/conta/AlterarSenha";
import ConfiguracoesRedirect from "@/pages/ConfiguracoesRedirect";
import NotFoundPage from "@/pages/NotFound";

import { AppLayoutProvider } from "@/hooks/use-app-layout";
import { PaletteProvider } from "@/hooks/use-palette";
import { ImpersonacaoProvider } from "@/hooks/use-impersonacao";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Evita recarregar a tela ao voltar para a aba do navegador
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function RequireAuth({
  children,
  checkAssinatura = true,
}: {
  children: React.ReactNode;
  checkAssinatura?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-dvh bg-background" />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!checkAssinatura) return <>{children}</>;

  return <AssinaturaGate>{children}</AssinaturaGate>;
}


function AuthEvents() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        navigate("/auth", { replace: true });
      } else if (event === "USER_UPDATED") {
        queryClient.invalidateQueries();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
        <AppLayoutProvider>
        <PaletteProvider>
        <ImpersonacaoProvider>

          <ScrollToTop />
          <AuthEvents />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/assinatura"
              element={
                <RequireAuth checkAssinatura={false}>
                  <RedirectSeAssinaturaAtiva>
                    <NovaAssinaturaPage />
                  </RedirectSeAssinaturaAtiva>
                </RequireAuth>
              }
            />

            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <RoleRedirect />
                </RequireAuth>
              }
            />
            <Route
              path="/sa/dashboard"
              element={
                <RequireAuth>
                  <RequireRole allow={["sa_admin"]}>
                    <SaDashboard />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/sa/empresas"
              element={
                <RequireAuth>
                  <RequireRole allow={["sa_admin"]}>
                    <EmpresasList />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/sa/empresas/nova"
              element={
                <RequireAuth>
                  <RequireRole allow={["sa_admin"]}>
                    <EmpresaForm />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/sa/empresas/:id"
              element={
                <RequireAuth>
                  <RequireRole allow={["sa_admin"]}>
                    <EmpresaForm />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/sa/planos/novo"
              element={
                <RequireAuth>
                  <RequireRole allow={["sa_admin"]}>
                    <PlanoForm />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/sa/planos/:id"
              element={
                <RequireAuth>
                  <RequireRole allow={["sa_admin"]}>
                    <PlanoForm />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/sa/planos"
              element={
                <RequireAuth>
                  <RequireRole allow={["sa_admin"]}>
                    <PlanosList />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/sa/assinaturas"
              element={
                <RequireAuth>
                  <RequireRole allow={["sa_admin"]}>
                    <AssinaturasList />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/sa/usuarios"
              element={
                <RequireAuth>
                  <RequireRole allow={["sa_admin"]}>
                    <UsuariosList />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/sa/configuracoes"
              element={
                <RequireAuth>
                  <RequireRole allow={["sa_admin"]}>
                    <SaConfiguracoes />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/configuracoes"
              element={
                <RequireAuth>
                  <RequireRole allow={["admin"]}>
                    <AdminConfiguracoes />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <RequireAuth>
                  <RequireRole allow={["admin"]}>
                    <AdminDashboard />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/clientes"
              element={
                <RequireAuth>
                  <RequireRole allow={["admin"]}>
                    <ClientesList />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/clientes/novo"
              element={
                <RequireAuth>
                  <RequireRole allow={["admin"]}>
                    <ClienteForm />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/clientes/:id"
              element={
                <RequireAuth>
                  <RequireRole allow={["admin"]}>
                    <ClienteForm />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/leads"
              element={
                <RequireAuth>
                  <RequireRole allow={["admin"]}>
                    <LeadsList />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/produtos"
              element={
                <RequireAuth>
                  <RequireRole allow={["admin"]}>
                    <ProdutosList />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/servicos"
              element={
                <RequireAuth>
                  <RequireRole allow={["admin"]}>
                    <ServicosList />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/servicos/novo"
              element={
                <RequireAuth>
                  <RequireRole allow={["admin"]}>
                    <ServicoForm />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/servicos/:id"
              element={
                <RequireAuth>
                  <RequireRole allow={["admin"]}>
                    <ServicoForm />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/agrupamento-servicos"
              element={
                <RequireAuth>
                  <RequireRole allow={["admin"]}>
                    <GruposServicosList />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/agrupamento-servicos/novo"
              element={
                <RequireAuth>
                  <RequireRole allow={["admin"]}>
                    <GrupoServicoForm />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/agrupamento-servicos/:id"
              element={
                <RequireAuth>
                  <RequireRole allow={["admin"]}>
                    <GrupoServicoForm />
                  </RequireRole>
                </RequireAuth>
              }
            />





            <Route
              path="/usuario/dashboard"
              element={
                <RequireAuth>
                  <RequireRole allow={["usuario"]}>
                    <UsuarioDashboard />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/conta/perfil"
              element={
                <RequireAuth>
                  <MeuPerfil />
                </RequireAuth>
              }
            />
            <Route
              path="/conta/seguranca"
              element={
                <RequireAuth>
                  <Seguranca />
                </RequireAuth>
              }
            />
            <Route
              path="/conta/senha"
              element={
                <RequireAuth>
                  <AlterarSenha />
                </RequireAuth>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <RequireAuth>
                  <ConfiguracoesRedirect />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFoundPage />} />


          </Routes>
          <SystemMessageDialog />
        </ImpersonacaoProvider>
        </PaletteProvider>
        </AppLayoutProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
    </ThemeProvider>
  );

}
