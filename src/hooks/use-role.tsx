import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";
import { useAuth } from "@/hooks/use-auth";

/** Tipos de usuário do sistema */
export type AppRole = "sa_admin" | "admin" | "usuario";

export const ROLE_LABELS: Record<AppRole, string> = {
  sa_admin: "Administrador do SaaS",
  admin: "Administrador da empresa",
  usuario: "Usuário da empresa",
};

// A tabela user_roles vive no Supabase autohospedado (fora dos tipos gerados).
const db = supabase as unknown as SupabaseClient;

export function useRoles() {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (authLoading) return;
    if (!userId) {
      setRoles([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    db.from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (!mounted) return;
        setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [userId, authLoading]);

  const hasRole = (role: AppRole) => roles.includes(role);

  return {
    roles,
    isLoading,
    hasRole,
    isSaAdmin: hasRole("sa_admin"),
    isAdmin: hasRole("admin") || hasRole("sa_admin"),
    isUsuario: roles.length > 0,
  };
}
