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

/** Todos os usuários do sistema (somente sa_admin). */
export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    staleTime: 30 * 1000,
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
