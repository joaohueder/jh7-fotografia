-- =====================================================================
-- JH7 Gestão Fotográfica — MÓDULO ORÇAMENTOS
-- Rode no Supabase AUTOHOSPEDADO depois de sql/43_grupos_servicos.sql.
--
-- Cria public.orcamentos: descrição, status, data do orçamento, validade
-- e o vínculo com um cliente ou lead (ambos ficam na tabela clientes).
-- Tudo isolado por empresa (o SA admin acessa ao entrar no painel da empresa).
-- =====================================================================

create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  descricao text not null,
  status text not null default 'RASCUNHO',
  data_orcamento date not null default current_date,
  validade date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.orcamentos
    add constraint orcamentos_status_check
    check (status in ('RASCUNHO', 'ENVIADO', 'APROVADO', 'RECUSADO', 'CANCELADO'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.orcamentos
    add constraint orcamentos_descricao_check
    check (char_length(btrim(descricao)) between 2 and 200);
exception when duplicate_object then null;
end $$;

create index if not exists orcamentos_empresa_idx on public.orcamentos (empresa_id, status);
create index if not exists orcamentos_cliente_idx on public.orcamentos (cliente_id);
create index if not exists orcamentos_data_idx on public.orcamentos (empresa_id, data_orcamento desc);

-- Garante que o cliente/lead escolhido é da MESMA empresa do orçamento.
create or replace function public.orcamentos_validar_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
begin
  select empresa_id into v_empresa from public.clientes where id = new.cliente_id;
  if v_empresa is null or v_empresa <> new.empresa_id then
    raise exception 'O cliente ou lead informado não pertence a esta empresa.';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists orcamentos_validar_cliente on public.orcamentos;
create trigger orcamentos_validar_cliente
  before insert or update on public.orcamentos
  for each row execute function public.orcamentos_validar_cliente();

-- Permissões da Data API ------------------------------------------------
grant select, insert, update, delete on public.orcamentos to authenticated;
grant all on public.orcamentos to service_role;

-- Segurança por linha ---------------------------------------------------
alter table public.orcamentos enable row level security;

drop policy if exists "orçamentos da própria empresa" on public.orcamentos;
create policy "orçamentos da própria empresa" on public.orcamentos
  for all to authenticated
  using (public.pode_acessar_empresa(empresa_id))
  with check (public.pode_acessar_empresa(empresa_id));

-- Tempo real ------------------------------------------------------------
alter table public.orcamentos replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.orcamentos;
exception when duplicate_object then null;
end $$;
