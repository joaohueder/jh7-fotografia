-- =====================================================================
-- JH7 Gestão Fotográfica — MÓDULO SERVIÇOS
-- Rode no Supabase AUTOHOSPEDADO depois de 37_fix_produtos_rls_sa.sql.
--
-- Cria public.servicos com isolamento total por empresa:
--   * cada serviço pertence a uma empresa (empresa_id obrigatório);
--   * o usuário só enxerga/edita serviços da própria empresa;
--   * o SA admin também acessa ao entrar no painel de uma empresa.
-- =====================================================================

create table if not exists public.servicos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null,
  status text not null default 'ATIVO',
  valor_custo numeric(12, 2) not null default 0,
  valor_venda numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.servicos
    add constraint servicos_status_check check (status in ('ATIVO', 'INATIVO'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.servicos
    add constraint servicos_valores_check check (valor_custo >= 0 and valor_venda >= 0);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.servicos
    add constraint servicos_nome_check check (char_length(btrim(nome)) between 2 and 120);
exception when duplicate_object then null;
end $$;

create index if not exists servicos_empresa_idx on public.servicos (empresa_id, status);

-- Nome único por empresa (case-insensitive).
create unique index if not exists servicos_empresa_nome_uidx
  on public.servicos (empresa_id, lower(btrim(nome)));

-- updated_at automático ------------------------------------------------
create or replace function public.servicos_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists servicos_updated_at on public.servicos;
create trigger servicos_updated_at
  before update on public.servicos
  for each row execute function public.servicos_set_updated_at();

-- Permissões da Data API ------------------------------------------------
grant select, insert, update, delete on public.servicos to authenticated;
grant all on public.servicos to service_role;

-- Segurança por linha ---------------------------------------------------
alter table public.servicos enable row level security;

drop policy if exists "servicos da própria empresa" on public.servicos;
create policy "servicos da própria empresa" on public.servicos
  for all to authenticated
  using (public.pode_acessar_empresa(empresa_id))
  with check (public.pode_acessar_empresa(empresa_id));

-- Tempo real ------------------------------------------------------------
alter table public.servicos replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.servicos;
exception when duplicate_object then null;
end $$;
