-- =====================================================================
-- 11_paletas.sql — Templates de cores (paleta primária/secundária/destaque)
-- Execute no SQL Editor do Supabase autohospedado.
-- =====================================================================

alter table public.sistema_config
  add column if not exists paleta text not null default 'noir-gold';

alter table public.usuario_preferencias
  add column if not exists paleta text;

-- ----------------------------------------------------- leitura consolidada (RPC)
create or replace function public.minha_paleta()
returns table (paleta text, padrao_sistema text)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(p.paleta, c.paleta) as paleta,
    c.paleta as padrao_sistema
  from public.sistema_config c
  left join public.usuario_preferencias p on p.user_id = auth.uid()
  where c.id
$$;

grant execute on function public.minha_paleta() to authenticated;
