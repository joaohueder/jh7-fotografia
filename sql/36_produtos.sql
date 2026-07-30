-- =====================================================================
-- JH7 Gestão Fotográfica — MÓDULO PRODUTOS
-- Rode no Supabase AUTOHOSPEDADO depois de 35_realtime_geral.sql.
--
-- Cria public.produtos com isolamento total por empresa:
--   * cada produto pertence a uma empresa (empresa_id obrigatório);
--   * o usuário só enxerga/edita produtos da própria empresa;
--   * valores de custo e venda são opcionais (null quando não informados).
-- =====================================================================

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null,
  status text not null default 'ATIVO',
  valor_custo numeric(12, 2),
  valor_venda numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.produtos
    add constraint produtos_status_check check (status in ('ATIVO', 'INATIVO'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.produtos
    add constraint produtos_valores_check check (
      (valor_custo is null or valor_custo >= 0)
      and (valor_venda is null or valor_venda >= 0)
    );
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.produtos
    add constraint produtos_nome_check check (char_length(btrim(nome)) between 2 and 120);
exception when duplicate_object then null;
end $$;

create index if not exists produtos_empresa_idx on public.produtos (empresa_id, status);

-- Nome único por empresa (case-insensitive).
create unique index if not exists produtos_empresa_nome_uidx
  on public.produtos (empresa_id, lower(btrim(nome)));

-- updated_at automático ------------------------------------------------
create or replace function public.produtos_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists produtos_updated_at on public.produtos;
create trigger produtos_updated_at
  before update on public.produtos
  for each row execute function public.produtos_set_updated_at();

-- Permissões da Data API ------------------------------------------------
grant select, insert, update, delete on public.produtos to authenticated;
grant all on public.produtos to service_role;

-- Segurança por linha ---------------------------------------------------
-- Usa pode_acessar_empresa(): libera a própria empresa do usuário e permite
-- que o SA admin visualize/gerencie ao acessar o painel de uma empresa.
alter table public.produtos enable row level security;

drop policy if exists "produtos_select_empresa" on public.produtos;
drop policy if exists "produtos_insert_empresa" on public.produtos;
drop policy if exists "produtos_update_empresa" on public.produtos;
drop policy if exists "produtos_delete_empresa" on public.produtos;

drop policy if exists "produtos da própria empresa" on public.produtos;
create policy "produtos da própria empresa" on public.produtos
  for all to authenticated
  using (public.pode_acessar_empresa(empresa_id))
  with check (public.pode_acessar_empresa(empresa_id));


-- Tempo real ------------------------------------------------------------
alter table public.produtos replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.produtos;
exception when duplicate_object then null;
end $$;
