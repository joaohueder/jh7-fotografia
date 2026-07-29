-- =====================================================================
-- 10_configuracoes.sql — Configurações do sistema (layout)
-- Execute no SQL Editor do Supabase autohospedado.
--
-- sistema_config        -> padrão global (aplicado a novos usuários)
-- usuario_preferencias  -> preferência individual (sobrepõe o padrão)
-- =====================================================================

-- ---------------------------------------------------------------- padrão global
create table if not exists public.sistema_config (
  id boolean primary key default true,
  max_width integer not null default 1200
    check (max_width between 960 and 1920),
  updated_at timestamptz not null default now(),
  constraint sistema_config_singleton check (id)
);

insert into public.sistema_config (id) values (true) on conflict (id) do nothing;

grant select on public.sistema_config to authenticated;
grant update on public.sistema_config to authenticated;
grant all on public.sistema_config to service_role;

alter table public.sistema_config enable row level security;

drop policy if exists "config lida por autenticados" on public.sistema_config;
create policy "config lida por autenticados"
  on public.sistema_config for select to authenticated using (true);

drop policy if exists "config alterada por sa_admin" on public.sistema_config;
create policy "config alterada por sa_admin"
  on public.sistema_config for update to authenticated
  using (public.has_role(auth.uid(), 'sa_admin'))
  with check (public.has_role(auth.uid(), 'sa_admin'));

-- ------------------------------------------------------- preferências por usuário
create table if not exists public.usuario_preferencias (
  user_id uuid primary key references auth.users(id) on delete cascade,
  max_width integer
    check (max_width is null or max_width between 960 and 1920),
  tema text check (tema is null or tema in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.usuario_preferencias to authenticated;
grant all on public.usuario_preferencias to service_role;

alter table public.usuario_preferencias enable row level security;

drop policy if exists "cada usuário gerencia suas preferências" on public.usuario_preferencias;
create policy "cada usuário gerencia suas preferências"
  on public.usuario_preferencias for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --------------------------------------------------------------- updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_usuario_preferencias_updated on public.usuario_preferencias;
create trigger trg_usuario_preferencias_updated
  before update on public.usuario_preferencias
  for each row execute function public.set_updated_at();

drop trigger if exists trg_sistema_config_updated on public.sistema_config;
create trigger trg_sistema_config_updated
  before update on public.sistema_config
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------- leitura consolidada (RPC)
-- Devolve a largura efetiva do usuário logado (preferência ou padrão global).
create or replace function public.meu_layout()
returns table (max_width integer, padrao_sistema integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(p.max_width, c.max_width) as max_width,
    c.max_width as padrao_sistema
  from public.sistema_config c
  left join public.usuario_preferencias p on p.user_id = auth.uid()
  where c.id
$$;

grant execute on function public.meu_layout() to authenticated;
