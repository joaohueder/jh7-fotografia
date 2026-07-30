-- =====================================================================
-- JH7 Gestão de Estúdios Fotográficos — MÓDULO CONTRATOS
-- Rode no Supabase AUTOHOSPEDADO depois de sql/47_orcamento_ajustes.sql.
--
-- Um contrato é sempre de um CLIENTE da empresa e pode nascer de um
-- ORÇAMENTO APROVADO (o vínculo fica guardado apenas como referência).
-- Os serviços/produtos são COPIADOS para contrato_itens, então o
-- contrato não muda se o cadastro de origem for alterado depois.
-- =====================================================================

create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  -- Referência opcional ao orçamento aprovado que originou o contrato
  orcamento_id uuid references public.orcamentos (id) on delete set null,
  titulo text not null,
  status text not null default 'RASCUNHO',
  data_contrato date not null default current_date,
  inicio_vigencia date,
  fim_vigencia date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.contratos
    add constraint contratos_status_check
    check (status in ('RASCUNHO', 'ASSINADO', 'VIGENTE', 'CONCLUIDO', 'CANCELADO'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.contratos
    add constraint contratos_titulo_check
    check (char_length(btrim(titulo)) between 2 and 200);
exception when duplicate_object then null;
end $$;

create index if not exists contratos_empresa_idx on public.contratos (empresa_id, status);
create index if not exists contratos_cliente_idx on public.contratos (cliente_id);
create index if not exists contratos_orcamento_idx on public.contratos (orcamento_id);
create index if not exists contratos_data_idx on public.contratos (empresa_id, data_contrato desc);

-- Valida empresa do cliente/orçamento e a ordem das datas de vigência.
create or replace function public.contratos_validar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
  v_status text;
begin
  select empresa_id into v_empresa from public.clientes where id = new.cliente_id;
  if v_empresa is null or v_empresa <> new.empresa_id then
    raise exception 'O cliente informado não pertence a esta empresa.';
  end if;

  if new.orcamento_id is not null then
    select empresa_id, status into v_empresa, v_status
      from public.orcamentos where id = new.orcamento_id;
    if v_empresa is null or v_empresa <> new.empresa_id then
      raise exception 'O orçamento informado não pertence a esta empresa.';
    end if;
    if v_status <> 'APROVADO' then
      raise exception 'Somente orçamentos aprovados podem gerar contrato.';
    end if;
  end if;

  if new.inicio_vigencia is not null
     and new.fim_vigencia is not null
     and new.fim_vigencia < new.inicio_vigencia then
    raise exception 'O fim da vigência não pode ser anterior ao início.';
  end if;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists contratos_validar on public.contratos;
create trigger contratos_validar
  before insert or update on public.contratos
  for each row execute function public.contratos_validar();

-- Itens (cópia/snapshot, sem relacionamento com serviços/produtos) --------
create table if not exists public.contrato_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  contrato_id uuid not null references public.contratos (id) on delete cascade,
  ordem integer not null default 0,
  origem_tipo text not null default 'SERVICO',
  origem_nome text,
  nome text not null,
  quantidade numeric(12, 2) not null default 1,
  valor_unitario numeric(12, 2),
  valor_custo numeric(12, 2),
  produtos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.contrato_itens
    add constraint contrato_itens_origem_check
    check (origem_tipo in ('SERVICO', 'GRUPO', 'MANUAL', 'ORCAMENTO'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.contrato_itens
    add constraint contrato_itens_nome_check
    check (char_length(btrim(nome)) between 1 and 200);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.contrato_itens
    add constraint contrato_itens_quantidade_check
    check (quantidade > 0);
exception when duplicate_object then null;
end $$;

create index if not exists contrato_itens_contrato_idx
  on public.contrato_itens (contrato_id, ordem);
create index if not exists contrato_itens_empresa_idx
  on public.contrato_itens (empresa_id);

drop trigger if exists contrato_itens_updated_at on public.contrato_itens;
create trigger contrato_itens_updated_at
  before update on public.contrato_itens
  for each row execute function public.servicos_set_updated_at();

-- Permissões da Data API ------------------------------------------------
grant select, insert, update, delete on public.contratos to authenticated;
grant all on public.contratos to service_role;
grant select, insert, update, delete on public.contrato_itens to authenticated;
grant all on public.contrato_itens to service_role;

-- Segurança por linha ---------------------------------------------------
alter table public.contratos enable row level security;
drop policy if exists "contratos da própria empresa" on public.contratos;
create policy "contratos da própria empresa" on public.contratos
  for all to authenticated
  using (public.pode_acessar_empresa(empresa_id))
  with check (public.pode_acessar_empresa(empresa_id));

alter table public.contrato_itens enable row level security;
drop policy if exists "itens do contrato da própria empresa" on public.contrato_itens;
create policy "itens do contrato da própria empresa" on public.contrato_itens
  for all to authenticated
  using (public.pode_acessar_empresa(empresa_id))
  with check (public.pode_acessar_empresa(empresa_id));

-- Tempo real ------------------------------------------------------------
alter table public.contratos replica identity full;
alter table public.contrato_itens replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.contratos;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.contrato_itens;
exception when duplicate_object then null;
end $$;
