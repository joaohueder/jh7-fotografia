import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { supabase } from "@/integrations/selfhosted/client";
import { SystemMessageDialog } from "@/components/system-message-dialog";
import LandingPage from "@/pages/Landing";
import AuthPage from "@/pages/Auth";
import SaDashboard from "@/pages/panels/SaDashboard";
import EmpresasList from "@/pages/panels/sa/Empresas";
import EmpresaForm from "@/pages/panels/sa/EmpresaForm";
import AdminDashboard from "@/pages/panels/AdminDashboard";
import UsuarioDashboard from "@/pages/panels/UsuarioDashboard";
import { RoleRedirect, RequireRole } from "@/components/role-routing";
import NotFoundPage from "@/pages/NotFound";

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

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-dvh bg-background" />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AuthEvents />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
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
              path="/usuario/dashboard"
              element={
                <RequireAuth>
                  <RequireRole allow={["usuario"]}>
                    <UsuarioDashboard />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <SystemMessageDialog />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
