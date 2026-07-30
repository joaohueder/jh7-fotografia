-- =====================================================================
-- JH7 Gestão Fotográfica — MIGRAÇÃO: valores de produtos opcionais
-- Rode no Supabase AUTOHOSPEDADO se você já executou o 36_produtos.sql.
--
-- Deixa os campos valor_custo e valor_venda nulos quando não informados,
-- em vez de obrigar o valor 0,00.
-- =====================================================================

-- Libera a obrigatoriedade e o padrão 0,00.
alter table public.produtos
  alter column valor_custo drop not null,
  alter column valor_custo drop default,
  alter column valor_venda drop not null,
  alter column valor_venda drop default;

-- Atualiza a restrição para permitir nulos (valores negativos seguem proibidos).
do $$
begin
  alter table public.produtos
    drop constraint if exists produtos_valores_check;
  alter table public.produtos
    add constraint produtos_valores_check check (
      (valor_custo is null or valor_custo >= 0)
      and (valor_venda is null or valor_venda >= 0)
    );
exception when others then null;
end $$;
