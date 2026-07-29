-- =====================================================================
-- JH7 Gestão Fotográfica — PLANOS: apenas 1 plano gratuito ATIVO
-- Rode este script no seu Supabase AUTOHOSPEDADO (SQL Editor),
-- depois de 14_planos_ordem.sql.
-- =====================================================================

-- A regra antiga permitia apenas 1 plano gratuito no total.
-- Agora a restrição vale somente para planos gratuitos ATIVOS.
drop index if exists public.planos_unico_gratuito;

-- Garante que não exista mais de um gratuito ativo antes de criar o índice:
-- mantém o mais antigo ativo e inativa os demais.
with gratuitos as (
  select id, row_number() over (order by created_at, id) as pos
  from public.planos
  where gratuito and ativo
)
update public.planos p
set ativo = false
from gratuitos g
where p.id = g.id and g.pos > 1;

create unique index if not exists planos_unico_gratuito_ativo
  on public.planos ((true))
  where gratuito and ativo;
