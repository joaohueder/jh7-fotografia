-- =====================================================================
-- JH7 Gestão Fotográfica — PLANOS: status, plano gratuito e valor
-- Rode este script no seu Supabase AUTOHOSPEDADO (SQL Editor),
-- depois de 12_planos.sql.
-- =====================================================================

alter table public.planos
  add column if not exists ativo boolean not null default true,
  add column if not exists gratuito boolean not null default false,
  add column if not exists valor numeric(12, 2);

-- Coerência: plano gratuito não tem valor; plano pago exige valor >= 0.
alter table public.planos drop constraint if exists planos_valor_coerente;
alter table public.planos add constraint planos_valor_coerente check (
  (gratuito = true and valor is null)
  or (gratuito = false and valor is not null and valor >= 0)
);

-- Somente 1 plano gratuito no sistema.
create unique index if not exists planos_unico_gratuito
  on public.planos ((true))
  where gratuito;
