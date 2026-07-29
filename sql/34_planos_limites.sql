-- =====================================================================
-- JH7 Gestão Fotográfica — LIMITES DO PLANO
-- Rode no Supabase AUTOHOSPEDADO depois de 33_lead_status.sql.
--
-- Adiciona os limites de uso de cada plano:
--   limite_leads    -> total de leads que a empresa pode cadastrar
--   limite_clientes -> total de clientes que a empresa pode cadastrar
-- NULL = ilimitado (sem restrição).
-- =====================================================================

alter table public.planos
  add column if not exists limite_leads integer,
  add column if not exists limite_clientes integer;

do $$
begin
  alter table public.planos
    add constraint planos_limite_leads_positivo
    check (limite_leads is null or limite_leads >= 0);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.planos
    add constraint planos_limite_clientes_positivo
    check (limite_clientes is null or limite_clientes >= 0);
exception when duplicate_object then null;
end $$;

comment on column public.planos.limite_leads is 'Máximo de leads por empresa. NULL = ilimitado.';
comment on column public.planos.limite_clientes is 'Máximo de clientes por empresa. NULL = ilimitado.';
