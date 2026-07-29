import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/selfhosted/client";
import type { AppRole } from "@/hooks/use-role";

// RPCs do Supabase autohospedado (fora dos tipos gerados).
const db = supabase as unknown as SupabaseClient;

export type UsuarioRole = AppRole | "sem_papel";

export interface UsuarioSistema {
  id: string;
  email: string | null;
  nome: string;
  role: UsuarioRole;
  ativo: boolean;
  empresa_id: string | null;
  empresa_nome: string | null;
  ultimo_login: string | null;
  created_at: string;
}

/** Todos os usuários do sistema (somente sa_admin), em tempo real. */
export function useUsuarios() {
  const qc = useQueryClient();

  // Atualiza a lista assim que perfis, papéis ou sessões mudarem no banco.
  useEffect(() => {
    const invalidar = () => qc.invalidateQueries({ queryKey: ["usuarios"] });
    const channel = supabase
      .channel("usuarios-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, invalidar)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, invalidar)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessoes_revogadas" },
        invalidar,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["usuarios"],
    staleTime: 0,
    refetchInterval: 15 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    queryFn: async (): Promise<UsuarioSistema[]> => {
      const { data, error } = await db.rpc("sa_listar_usuarios");
      if (error) throw error;
      return (data ?? []) as UsuarioSistema[];
    },
  });
}

/** Ativa ou inativa o acesso de um usuário. */
export function useToggleUsuarioAtivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await db.rpc("sa_set_usuario_ativo", { p_id: id, p_ativo: ativo });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}

/** Encerra todas as sessões ativas de um usuário (logoff forçado). */
export function useLogoffUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<number> => {
      const { data, error } = await db.rpc("sa_logoff_usuario", { p_id: id });
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}
