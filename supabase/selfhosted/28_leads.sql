-- =====================================================================
-- 28 — Origem do cadastro (CLIENTE / LEAD)
-- Leads são registros simples (nome + WhatsApp) gravados na mesma
-- tabela de clientes, diferenciados pela coluna "origem".
--   CLIENTE → cadastrado pela tela de Clientes
--   LEAD    → cadastrado pela tela de Leads ou por formulários de lead
-- =====================================================================

alter table public.clientes
  add column if not exists origem text not null default 'CLIENTE';

-- Normaliza valores antigos antes de aplicar a restrição
update public.clientes
   set origem = 'CLIENTE'
 where origem is null or origem not in ('CLIENTE', 'LEAD');

alter table public.clientes drop constraint if exists clientes_origem_chk;
alter table public.clientes
  add constraint clientes_origem_chk check (origem in ('CLIENTE', 'LEAD'));

create index if not exists clientes_origem_idx on public.clientes (empresa_id, origem);
