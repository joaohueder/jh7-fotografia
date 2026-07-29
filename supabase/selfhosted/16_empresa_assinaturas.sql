-- =====================================================================
-- JH7 Gestão Fotográfica — ASSINATURAS DA EMPRESA
-- Rode este script no seu Supabase AUTOHOSPEDADO (SQL Editor),
-- depois de 02_empresas.sql e 15_planos_gratuito_ativo.sql.
--
-- Regras:
--  * uma empresa pode ter várias assinaturas (histórico);
--  * apenas UMA assinatura ativa por empresa (índice único parcial);
--  * troca de plano é feita por RPC transacional restrita ao sa_admin.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.empresa_assinaturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  plano_id uuid references public.planos(id) on delete restrict,

  -- snapshot do plano no momento da contratação (o plano pode mudar depois)
  plano_nome text not null,
  gratuito boolean not null default false,
  valor numeric(12, 2),

  ativo boolean not null default true,
  inicio date not null default current_date,
  fim date,
  observacao text,

  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists empresa_assinaturas_empresa_idx
  on public.empresa_assinaturas (empresa_id, created_at desc);

-- Somente uma assinatura ativa por empresa.
create unique index if not exists empresa_assinaturas_unica_ativa
  on public.empresa_assinaturas (empresa_id)
  where ativo;

-- updated_at automático ------------------------------------------------
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

drop trigger if exists trg_empresa_assinaturas_updated_at on public.empresa_assinaturas;
create trigger trg_empresa_assinaturas_updated_at
  before update on public.empresa_assinaturas
  for each row execute function public.set_updated_at();

-- Validação de datas (trigger, não CHECK, por depender de dados variáveis).
create or replace function public.empresa_assinaturas_valida()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.fim is not null and new.fim < new.inicio then
    raise exception 'A data final não pode ser anterior à data inicial';
  end if;
  if new.gratuito then
    new.valor := null;
  elsif new.valor is null or new.valor < 0 then
    raise exception 'Informe um valor válido para a assinatura';
  end if;
  if new.ativo then
    new.fim := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_empresa_assinaturas_valida on public.empresa_assinaturas;
create trigger trg_empresa_assinaturas_valida
  before insert or update on public.empresa_assinaturas
  for each row execute function public.empresa_assinaturas_valida();

-- Permissões da Data API -------------------------------------------------
grant select on public.empresa_assinaturas to authenticated;
grant all on public.empresa_assinaturas to service_role;

alter table public.empresa_assinaturas enable row level security;

-- SA administra tudo; membros apenas leem as assinaturas da própria empresa.
drop policy if exists "sa_admin gerencia assinaturas" on public.empresa_assinaturas;
create policy "sa_admin gerencia assinaturas" on public.empresa_assinaturas
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'sa_admin'))
  with check (public.has_role(auth.uid(), 'sa_admin'));

drop policy if exists "membros leem assinaturas da propria empresa"
  on public.empresa_assinaturas;
create policy "membros leem assinaturas da propria empresa" on public.empresa_assinaturas
  for select
  to authenticated
  using (
    empresa_id = (select p.empresa_id from public.profiles p where p.id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- RPC: contratar/trocar plano (encerra a ativa e abre a nova)
-- ---------------------------------------------------------------------
create or replace function public.sa_definir_assinatura(
  p_empresa_id uuid,
  p_plano_id uuid,
  p_inicio date default null,
  p_observacao text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plano public.planos%rowtype;
  v_inicio date := coalesce(p_inicio, current_date);
  v_id uuid;
begin
  if not public.has_role(auth.uid(), 'sa_admin') then
    raise exception 'Acesso negado';
  end if;

  if not exists (select 1 from public.empresas e where e.id = p_empresa_id) then
    raise exception 'Empresa não encontrada';
  end if;

  select * into v_plano from public.planos where id = p_plano_id;
  if not found then
    raise exception 'Plano não encontrado';
  end if;
  if not v_plano.ativo then
    raise exception 'Este plano está inativo e não pode ser contratado';
  end if;

  -- Encerra a assinatura ativa atual (se houver).
  update public.empresa_assinaturas
     set ativo = false,
         fim = greatest(inicio, v_inicio)
   where empresa_id = p_empresa_id
     and ativo;

  insert into public.empresa_assinaturas
    (empresa_id, plano_id, plano_nome, gratuito, valor, ativo, inicio, observacao, criado_por)
  values
    (p_empresa_id, v_plano.id, v_plano.nome, v_plano.gratuito, v_plano.valor,
     true, v_inicio, nullif(trim(coalesce(p_observacao, '')), ''), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.sa_definir_assinatura(uuid, uuid, date, text) from public, anon;
grant execute on function public.sa_definir_assinatura(uuid, uuid, date, text) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: encerrar a assinatura ativa
-- ---------------------------------------------------------------------
create or replace function public.sa_encerrar_assinatura(
  p_id uuid,
  p_observacao text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
begin
  if not public.has_role(auth.uid(), 'sa_admin') then
    raise exception 'Acesso negado';
  end if;

  select empresa_id into v_empresa
    from public.empresa_assinaturas
   where id = p_id and ativo;

  if not found then
    raise exception 'Assinatura ativa não encontrada';
  end if;

  update public.empresa_assinaturas
     set ativo = false,
         fim = greatest(inicio, current_date),
         observacao = coalesce(nullif(trim(coalesce(p_observacao, '')), ''), observacao)
   where id = p_id;
end;
$$;

revoke all on function public.sa_encerrar_assinatura(uuid, text) from public, anon;
grant execute on function public.sa_encerrar_assinatura(uuid, text) to authenticated;
