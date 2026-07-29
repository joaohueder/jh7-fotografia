-- =====================================================================
-- 11_paletas.sql — Templates de cores (primária, secundária, destaque)
-- Execute no SQL Editor do Supabase autohospedado. Idempotente.
-- =====================================================================

alter table public.sistema_config
  add column if not exists paleta text not null default 'sakura';

alter table public.sistema_config
  add column if not exists paleta_cores jsonb
  not null default '{"primary":"#c9a9e9","secondary":"#9cc9b4","accent":"#f1c9b8"}'::jsonb;

alter table public.usuario_preferencias
  add column if not exists paleta text;

alter table public.usuario_preferencias
  add column if not exists paleta_cores jsonb;

-- ----------------------------------------------------- leitura consolidada (RPC)
drop function if exists public.minha_paleta();

create or replace function public.minha_paleta()
returns table (
  paleta text,
  cores jsonb,
  padrao_sistema text,
  padrao_cores jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(p.paleta, c.paleta)             as paleta,
    coalesce(p.paleta_cores, c.paleta_cores) as cores,
    c.paleta                                  as padrao_sistema,
    c.paleta_cores                            as padrao_cores
  from public.sistema_config c
  left join public.usuario_preferencias p on p.user_id = auth.uid()
  where c.id
$$;

grant execute on function public.minha_paleta() to authenticated;
