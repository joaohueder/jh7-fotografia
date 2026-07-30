-- =====================================================================
-- JH7 Gestão Fotográfica — ORÇAMENTO: desconto/acréscimo e observações
-- Rode no Supabase AUTOHOSPEDADO depois de sql/45_orcamento_itens.sql.
--
-- Acrescenta em public.orcamentos:
--   ajuste_tipo      NENHUM | DESCONTO | ACRESCIMO
--   ajuste_valor     valor em reais do desconto (subtrai) ou acréscimo (soma)
--   ajuste_descricao motivo do desconto/acréscimo (texto livre)
--   observacoes      observação geral da proposta
-- =====================================================================

alter table public.orcamentos
  add column if not exists ajuste_tipo text not null default 'NENHUM',
  add column if not exists ajuste_valor numeric(12, 2),
  add column if not exists ajuste_descricao text,
  add column if not exists observacoes text;

do $$
begin
  alter table public.orcamentos
    add constraint orcamentos_ajuste_tipo_check
    check (ajuste_tipo in ('NENHUM', 'DESCONTO', 'ACRESCIMO'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.orcamentos
    add constraint orcamentos_ajuste_valor_check
    check (ajuste_valor is null or ajuste_valor >= 0);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.orcamentos
    add constraint orcamentos_ajuste_descricao_check
    check (ajuste_descricao is null or char_length(btrim(ajuste_descricao)) <= 200);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.orcamentos
    add constraint orcamentos_observacoes_check
    check (observacoes is null or char_length(observacoes) <= 2000);
exception when duplicate_object then null;
end $$;
