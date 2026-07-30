-- =====================================================================
-- JH7 Gestão Fotográfica — MÓDULO AGRUPAMENTO DE SERVIÇOS
-- Rode no Supabase AUTOHOSPEDADO depois de 42_servico_produtos_ordem.sql.
--
-- Cria:
--   * public.servico_grupos      -> o agrupamento (nome, status)
--   * public.servico_grupo_itens -> os serviços que fazem parte do grupo,
--                                    na ordem escolhida por arrastar e soltar.
-- Tudo isolado por empresa (o SA admin acessa ao entrar no painel da empresa).
-- =====================================================================

create table if not exists public.servico_grupos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null,
  descricao text,
  status text not null default 'ATIVO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.servico_grupos
    add constraint servico_grupos_status_check check (status in ('ATIVO', 'INATIVO'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.servico_grupos
    add constraint servico_grupos_nome_check check (char_length(btrim(nome)) between 2 and 120);
exception when duplicate_object then null;
end $$;

create index if not exists servico_grupos_empresa_idx
  on public.servico_grupos (empresa_id, status);

create unique index if not exists servico_grupos_empresa_nome_uidx
  on public.servico_grupos (empresa_id, lower(btrim(nome)));

-- Itens do grupo --------------------------------------------------------
create table if not exists public.servico_grupo_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  grupo_id uuid not null references public.servico_grupos (id) on delete cascade,
  servico_id uuid not null references public.servicos (id) on delete cascade,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists servico_grupo_itens_uidx
  on public.servico_grupo_itens (grupo_id, servico_id);

create index if not exists servico_grupo_itens_empresa_idx
  on public.servico_grupo_itens (empresa_id, grupo_id);

create index if not exists servico_grupo_itens_ordem_idx
  on public.servico_grupo_itens (grupo_id, ordem);

-- updated_at automático (reaproveita a função criada em 38_servicos.sql)
drop trigger if exists servico_grupos_updated_at on public.servico_grupos;
create trigger servico_grupos_updated_at
  before update on public.servico_grupos
  for each row execute function public.servicos_set_updated_at();

drop trigger if exists servico_grupo_itens_updated_at on public.servico_grupo_itens;
create trigger servico_grupo_itens_updated_at
  before update on public.servico_grupo_itens
  for each row execute function public.servicos_set_updated_at();

-- Permissões da Data API ------------------------------------------------
grant select, insert, update, delete on public.servico_grupos to authenticated;
grant all on public.servico_grupos to service_role;
grant select, insert, update, delete on public.servico_grupo_itens to authenticated;
grant all on public.servico_grupo_itens to service_role;

-- Segurança por linha ---------------------------------------------------
alter table public.servico_grupos enable row level security;
alter table public.servico_grupo_itens enable row level security;

drop policy if exists "grupos de serviços da própria empresa" on public.servico_grupos;
create policy "grupos de serviços da própria empresa" on public.servico_grupos
  for all to authenticated
  using (public.pode_acessar_empresa(empresa_id))
  with check (public.pode_acessar_empresa(empresa_id));

drop policy if exists "itens do grupo da própria empresa" on public.servico_grupo_itens;
create policy "itens do grupo da própria empresa" on public.servico_grupo_itens
  for all to authenticated
  using (public.pode_acessar_empresa(empresa_id))
  with check (public.pode_acessar_empresa(empresa_id));

-- Tempo real ------------------------------------------------------------
alter table public.servico_grupos replica identity full;
alter table public.servico_grupo_itens replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.servico_grupos;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.servico_grupo_itens;
exception when duplicate_object then null;
end $$;
