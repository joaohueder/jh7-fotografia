import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtime } from "@/hooks/use-realtime";

const db = supabase as unknown as SupabaseClient;

export interface PerfilBasico {
  full_name: string | null;
  display_name: string | null;
}

/** Perfil do usuário logado (nome completo e como quer ser chamado). */
export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Tempo real: o nome exibido muda na hora se o perfil for alterado.
  useRealtime("profile", ["profiles"], [["profile", userId]], Boolean(userId));

  const { data, isLoading } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PerfilBasico | null> => {
      const { data, error } = await db
        .from("profiles")
        .select("full_name, display_name")
        .eq("id", userId)
        .maybeSingle();
      if (error) return null;
      return (data as PerfilBasico | null) ?? null;
    },
  });

  const metaFullName = (user?.user_metadata?.full_name as string | undefined) ?? null;
  const fullName = data?.full_name?.trim() || metaFullName || null;
  const displayName = data?.display_name?.trim() || fullName?.split(" ")[0] || user?.email || null;

  return { fullName, displayName, email: user?.email ?? null, isLoading };
}
