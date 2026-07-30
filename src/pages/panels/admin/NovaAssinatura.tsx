import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Check, CreditCard, Loader2, LogOut } from "lucide-react";

import { usePageMeta } from "@/hooks/use-page-meta";
import { useAuth } from "@/hooks/use-auth";
import { usePlanos, type Plano } from "@/hooks/use-planos";
import { supabase } from "@/integrations/selfhosted/client";
import { formatMoney } from "@/lib/br-masks";
import { notifyError, notifySuccess, notifyValidation } from "@/lib/system-message";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const db = supabase as unknown as SupabaseClient;

export default function NovaAssinaturaPage() {
  usePageMeta(
    "Assinatura — JH7 Gestão de Estúdios Fotográficos",
    "Contrate um plano para liberar o acesso ao sistema.",
  );
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: planos, isLoading } = usePlanos();
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const disponiveis = useMemo(
    () => (planos ?? []).filter((p: Plano) => p.ativo),
    [planos],
  );

  const contratar = useMutation({
    mutationFn: async (planoId: string) => {
      const { error } = await db.rpc("admin_contratar_assinatura", {
        p_plano_id: planoId,
        p_observacao: null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["meu-acesso"] });
      await qc.invalidateQueries({ queryKey: ["empresa-assinaturas"] });
      notifySuccess("Plano contratado com sucesso. Bom trabalho!");
      navigate("/dashboard", { replace: true });
    },
    onError: (err) =>
      notifyError(err, {
        title: "Não foi possível contratar o plano",
        description: "Tente novamente ou fale com o suporte JH7.",
      }),
  });

  function handleContratar() {
    if (!selecionado) {
      notifyValidation("Escolha um plano para continuar.");
      return;
    }
    contratar.mutate(selecionado);
  }

  return (
    <div className="min-h-dvh bg-background px-[var(--gutter)] py-[clamp(1.5rem,6vw,4rem)]">
      <div className="mx-auto w-full max-w-[54rem] space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-3 text-[0.6875rem] font-bold uppercase tracking-[0.24em] text-gold">
              <span aria-hidden className="h-px w-8 bg-gold/50" />
              Assinatura necessária
            </p>
            <h1 className="mt-3 text-[clamp(1.5rem,3vw,2.25rem)] leading-tight">
              Escolha um plano para continuar
            </h1>
            <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
              Sua empresa está sem uma assinatura ativa. Contrate um plano para liberar o acesso
              ao sistema para você e para os usuários da sua equipe.
            </p>
          </div>
          <Button
            variant="outline"
            className="h-11 shrink-0 rounded-xl"
            onClick={() => void signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </header>

        {isLoading ? (
          <div className="flex min-h-[16rem] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gold" />
          </div>
        ) : disponiveis.length === 0 ? (
          <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
            Nenhum plano disponível no momento. Fale com o suporte JH7.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {disponiveis.map((plano) => {
              const ativo = selecionado === plano.id;
              return (
                <button
                  key={plano.id}
                  type="button"
                  onClick={() => setSelecionado(plano.id)}
                  className={cn(
                    "glass group relative rounded-2xl p-6 text-left transition-all duration-300",
                    ativo
                      ? "border-gold/60 ring-2 ring-gold/40"
                      : "hover:-translate-y-0.5 hover:border-gold/30",
                  )}
                >
                  {ativo && (
                    <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <CreditCard className="h-5 w-5 text-gold" />
                  <h2 className="mt-4 text-lg leading-snug">{plano.nome}</h2>
                  <p className="mt-3 text-2xl font-bold tracking-tight">
                    {plano.gratuito ? "Gratuito" : formatMoney(plano.valor ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Vigência de 30 dias</p>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            className="h-12 min-w-[14rem] rounded-xl text-[15px] font-bold"
            disabled={!selecionado || contratar.isPending}
            onClick={handleContratar}
          >
            {contratar.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Contratando...
              </>
            ) : (
              "Contratar plano"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
