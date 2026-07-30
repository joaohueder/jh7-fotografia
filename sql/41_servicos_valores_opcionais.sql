-- =====================================================================
-- JH7 Gestão Fotográfica — MIGRAÇÃO: valores de serviços opcionais
-- Rode no Supabase AUTOHOSPEDADO se você já executou 38_servicos.sql
-- e 39_servico_produtos.sql.
--
-- Deixa custo adicional, custo total e valor de venda em branco (NULL)
-- quando não informados, em vez de obrigar 0,00.
-- =====================================================================

alter table public.servicos
  alter column valor_custo drop not null,
  alter column valor_custo drop default,
  alter column valor_venda drop not null,
  alter column valor_venda drop default;

alter table public.servicos
  alter column custo_adicional drop not null,
  alter column custo_adicional drop default;

-- Restrições passam a aceitar nulos (negativos seguem proibidos).
do $$
begin
  alter table public.servicos
    drop constraint if exists servicos_valores_check;
  alter table public.servicos
    add constraint servicos_valores_check check (
      (valor_custo is null or valor_custo >= 0)
      and (valor_venda is null or valor_venda >= 0)
    );

  alter table public.servicos
    drop constraint if exists servicos_custo_adicional_check;
  alter table public.servicos
    add constraint servicos_custo_adicional_check check (
      custo_adicional is null or custo_adicional >= 0
    );
end $$;
