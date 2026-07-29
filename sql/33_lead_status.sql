-- =====================================================================
-- JH7 Gestão Fotográfica — SITUAÇÃO DO LEAD
-- Rode no Supabase AUTOHOSPEDADO depois de 32_clientes_realtime.sql.
--
-- Cria a coluna lead_status em public.clientes para acompanhar o funil:
--   AGUARDANDO -> ainda em negociação (padrão)
--   DESISTIU   -> o contato informou que não tem mais interesse
-- "Virou cliente" NÃO é gravado aqui: é deduzido automaticamente quando o
-- cadastro completo é preenchido (campo documento preenchido).
-- =====================================================================

alter table public.clientes
  add column if not exists lead_status text not null default 'AGUARDANDO';

do $$
begin
  alter table public.clientes
    add constraint clientes_lead_status_check
    check (lead_status in ('AGUARDANDO', 'DESISTIU'));
exception when duplicate_object then null;
end $$;

create index if not exists clientes_lead_status_idx
  on public.clientes (empresa_id, lead_status);
