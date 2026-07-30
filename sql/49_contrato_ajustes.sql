-- =====================================================================
-- JH7 Gestão de Estúdios Fotográficos — AJUSTES DO CONTRATO
-- Rode no Supabase AUTOHOSPEDADO depois de sql/48_contratos.sql.
--
-- Mesmo esquema já usado no orçamento: o contrato pode ter VÁRIOS
-- descontos e acréscimos, cada um com valor e motivo próprios. O valor
-- final é o total dos serviços menos os descontos mais os acréscimos.
-- Quando o contrato nasce de um orçamento aprovado, os ajustes do
-- orçamento são COPIADOS para o contrato pela tela do sistema.
-- =====================================================================

create table if not exists public.contrato_ajustes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  contrato_id uuid not null references public.contratos (id) on delete cascade,
  ordem integer not null default 0,
  tipo text not null default 'DESCONTO',
  valor numeric(12, 2) not null default 0,
  descricao text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.contrato_ajustes
    add constraint contrato_ajustes_tipo_check
    check (tipo in ('DESCONTO', 'ACRESCIMO'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.contrato_ajustes
    add constraint contrato_ajustes_valor_check
    check (valor >= 0);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.contrato_ajustes
    add constraint contrato_ajustes_descricao_check
    check (char_length(btrim(descricao)) between 2 and 200);
exception when duplicate_object then null;
end $$;

create index if not exists contrato_ajustes_contrato_idx
  on public.contrato_ajustes (contrato_id, ordem);

create index if not exists contrato_ajustes_empresa_idx
  on public.contrato_ajustes (empresa_id);

drop trigger if exists contrato_ajustes_updated_at on public.contrato_ajustes;
create trigger contrato_ajustes_updated_at
  before update on public.contrato_ajustes
  for each row execute function public.servicos_set_updated_at();

-- Permissões da Data API ------------------------------------------------
grant select, insert, update, delete on public.contrato_ajustes to authenticated;
grant all on public.contrato_ajustes to service_role;

-- Segurança por linha ---------------------------------------------------
alter table public.contrato_ajustes enable row level security;

drop policy if exists "ajustes do contrato da própria empresa" on public.contrato_ajustes;
create policy "ajustes do contrato da própria empresa" on public.contrato_ajustes
  for all to authenticated
  using (public.pode_acessar_empresa(empresa_id))
  with check (public.pode_acessar_empresa(empresa_id));

-- Tempo real ------------------------------------------------------------
alter table public.contrato_ajustes replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.contrato_ajustes;
exception when duplicate_object then null;
end $$;
