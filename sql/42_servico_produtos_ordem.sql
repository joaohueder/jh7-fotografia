-- =====================================================================
-- JH7 Gestão Fotográfica — ORDEM DOS PRODUTOS NA COMPOSIÇÃO DO SERVIÇO
-- Rode no Supabase AUTOHOSPEDADO depois de 39_servico_produtos.sql.
--
-- Guarda a posição escolhida pelo usuário ao arrastar e soltar os
-- produtos que compõem o serviço.
-- =====================================================================

alter table public.servico_produtos
  add column if not exists ordem integer not null default 0;

create index if not exists servico_produtos_ordem_idx
  on public.servico_produtos (servico_id, ordem);
