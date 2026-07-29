-- =====================================================================
-- JH7 Gestão Fotográfica — Módulo PLANOS (SaaS)
-- Rode este script no seu Supabase AUTOHOSPEDADO (SQL Editor).
-- Pré-requisitos: public.user_roles e public.has_role(uuid, app_role).
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Nome do plano é único (sem diferenciar maiúsculas/minúsculas).
create unique index if not exists planos_nome_unico
  on public.planos (lower(nome));

-- updated_at automático -------------------------------------------------
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

drop trigger if exists trg_planos_updated_at on public.planos;
create trigger trg_planos_updated_at
  before update on public.planos
  for each row execute function public.set_updated_at();

-- Permissões da Data API -------------------------------------------------
grant select, insert, update, delete on public.planos to authenticated;
grant all on public.planos to service_role;

alter table public.planos enable row level security;

-- Somente o SA administra os planos; qualquer autenticado pode ler.
drop policy if exists "sa_admin gerencia planos" on public.planos;
create policy "sa_admin gerencia planos" on public.planos
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'sa_admin'))
  with check (public.has_role(auth.uid(), 'sa_admin'));

drop policy if exists "autenticados leem planos" on public.planos;
create policy "autenticados leem planos" on public.planos
  for select
  to authenticated
  using (true);
