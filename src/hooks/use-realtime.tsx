import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";

import { supabase } from "@/integrations/selfhosted/client";

/**
 * Tempo real padrão do sistema.
 *
 * Escuta as tabelas informadas no banco e recarrega automaticamente as
 * consultas indicadas — assim a tela do usuário mostra sempre o dado mais
 * recente, mesmo quando a alteração veio de outra pessoa ou de outra aba.
 *
 * Uso:
 *   useRealtime("empresas", ["empresas", "empresa_contatos"], [["empresas"]]);
 */
export function useRealtime(
  nome: string,
  tabelas: string[],
  chaves: QueryKey[],
  ativo = true,
) {
  const qc = useQueryClient();

  // Serializado para não recriar o canal a cada render.
  const tabelasKey = tabelas.join(",");
  const chavesKey = JSON.stringify(chaves);

  useEffect(() => {
    if (!ativo) return;

    const listaTabelas: string[] = tabelasKey ? tabelasKey.split(",") : [];
    const listaChaves: QueryKey[] = JSON.parse(chavesKey) as QueryKey[];
    if (!listaTabelas.length || !listaChaves.length) return;

    const invalidar = () => {
      for (const queryKey of listaChaves) {
        qc.invalidateQueries({ queryKey, refetchType: "active" });
      }
    };

    // Sufixo aleatório: evita conflito quando o mesmo hook é usado em telas
    // diferentes ao mesmo tempo.
    const channel = supabase.channel(
      `rt-${nome}-${Math.random().toString(36).slice(2, 9)}`,
    );

    for (const table of listaTabelas) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, invalidar);
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, nome, tabelasKey, chavesKey, ativo]);
}
