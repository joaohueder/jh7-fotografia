-- =====================================================================
-- JH7 Gestão de Estúdios Fotográficos — AJUSTES DO ORÇAMENTO
-- Rode no Supabase AUTOHOSPEDADO depois de sql/46_orcamento_ajuste_observacoes.sql.
--
-- Agora o orçamento pode ter VÁRIOS descontos e acréscimos: cada um é um
-- item adicional com tipo, valor e motivo. O valor final é o total dos
-- serviços menos os descontos mais os acréscimos.
-- =====================================================================

create table if not exists public.orcamento_ajustes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  ordem integer not null default 0,
  tipo text not null default 'DESCONTO',
  valor numeric(12, 2) not null default 0,
  descricao text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.orcamento_ajustes
    add constraint orcamento_ajustes_tipo_check
    check (tipo in ('DESCONTO', 'ACRESCIMO'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.orcamento_ajustes
    add constraint orcamento_ajustes_valor_check
    check (valor >= 0);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.orcamento_ajustes
    add constraint orcamento_ajustes_descricao_check
    check (char_length(btrim(descricao)) between 2 and 200);
exception when duplicate_object then null;
end $$;

create index if not exists orcamento_ajustes_orcamento_idx
  on public.orcamento_ajustes (orcamento_id, ordem);

create index if not exists orcamento_ajustes_empresa_idx
  on public.orcamento_ajustes (empresa_id);

drop trigger if exists orcamento_ajustes_updated_at on public.orcamento_ajustes;
create trigger orcamento_ajustes_updated_at
  before update on public.orcamento_ajustes
  for each row execute function public.servicos_set_updated_at();

-- Permissões da Data API ------------------------------------------------
grant select, insert, update, delete on public.orcamento_ajustes to authenticated;
grant all on public.orcamento_ajustes to service_role;

-- Segurança por linha ---------------------------------------------------
alter table public.orcamento_ajustes enable row level security;

drop policy if exists "ajustes do orçamento da própria empresa" on public.orcamento_ajustes;
create policy "ajustes do orçamento da própria empresa" on public.orcamento_ajustes
  for all to authenticated
  using (public.pode_acessar_empresa(empresa_id))
  with check (public.pode_acessar_empresa(empresa_id));

-- Tempo real ------------------------------------------------------------
alter table public.orcamento_ajustes replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.orcamento_ajustes;
exception when duplicate_object then null;
end $$;

-- Migra o desconto/acréscimo único que já existia para a nova tabela ----
insert into public.orcamento_ajustes (empresa_id, orcamento_id, ordem, tipo, valor, descricao)
select o.empresa_id,
       o.id,
       0,
       o.ajuste_tipo,
       coalesce(o.ajuste_valor, 0),
       coalesce(nullif(btrim(o.ajuste_descricao), ''), 'Ajuste do orçamento')
from public.orcamentos o
where o.ajuste_tipo in ('DESCONTO', 'ACRESCIMO')
  and not exists (
    select 1 from public.orcamento_ajustes a where a.orcamento_id = o.id
  );
