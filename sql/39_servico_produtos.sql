-- =====================================================================
-- JH7 Gestão Fotográfica — COMPOSIÇÃO DO SERVIÇO (produtos que compõem)
-- Rode no Supabase AUTOHOSPEDADO depois de 38_servicos.sql.
--
-- Cria public.servico_produtos: os produtos que fazem parte de um serviço,
-- com a quantidade usada em cada atendimento.
-- Também adiciona servicos.custo_adicional (custos que não vêm de produtos,
-- como mão de obra e deslocamento). O valor de custo do serviço passa a ser
-- custo_adicional + soma dos produtos da composição.
-- =====================================================================

alter table public.servicos
  add column if not exists custo_adicional numeric(12, 2);

create table if not exists public.servico_produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  servico_id uuid not null references public.servicos (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  quantidade numeric(12, 3) not null default 1,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.servico_produtos
    add constraint servico_produtos_qtd_check check (quantidade > 0 and quantidade <= 100000);
exception when duplicate_object then null;
end $$;

create unique index if not exists servico_produtos_uidx
  on public.servico_produtos (servico_id, produto_id);

create index if not exists servico_produtos_empresa_idx
  on public.servico_produtos (empresa_id, servico_id);

create index if not exists servico_produtos_ordem_idx
  on public.servico_produtos (servico_id, ordem);

-- updated_at automático ------------------------------------------------
drop trigger if exists servico_produtos_updated_at on public.servico_produtos;
create trigger servico_produtos_updated_at
  before update on public.servico_produtos
  for each row execute function public.servicos_set_updated_at();

-- Permissões da Data API ------------------------------------------------
grant select, insert, update, delete on public.servico_produtos to authenticated;
grant all on public.servico_produtos to service_role;

-- Segurança por linha ---------------------------------------------------
alter table public.servico_produtos enable row level security;

drop policy if exists "composição da própria empresa" on public.servico_produtos;
create policy "composição da própria empresa" on public.servico_produtos
  for all to authenticated
  using (public.pode_acessar_empresa(empresa_id))
  with check (public.pode_acessar_empresa(empresa_id));

-- Tempo real ------------------------------------------------------------
alter table public.servico_produtos replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.servico_produtos;
exception when duplicate_object then null;
end $$;
