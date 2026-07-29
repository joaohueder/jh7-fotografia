-- =====================================================================
-- JH7 Gestão Fotográfica — VIGÊNCIA DE 30 DIAS NAS ASSINATURAS
-- Rode depois de 16_empresa_assinaturas.sql.
--
-- Regras:
--  * toda assinatura tem vigência de 30 dias a partir da data de início;
--  * o campo `fim` passa a ser sempre calculado (inicio + 30 dias);
--  * ao encerrar manualmente, o `fim` vira a data do encerramento.
-- =====================================================================

alter table public.empresa_assinaturas
  add column if not exists vigencia_dias integer not null default 30;

alter table public.empresa_assinaturas
  drop constraint if exists empresa_assinaturas_vigencia_positiva;
alter table public.empresa_assinaturas
  add constraint empresa_assinaturas_vigencia_positiva
  check (vigencia_dias > 0);

-- Trigger de validação: calcula o fim pela vigência quando a assinatura
-- está ativa (antes o fim era zerado nesse caso).
create or replace function public.empresa_assinaturas_valida()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.vigencia_dias is null or new.vigencia_dias <= 0 then
    new.vigencia_dias := 30;
  end if;

  if new.gratuito then
    new.valor := null;
  elsif new.valor is null or new.valor < 0 then
    raise exception 'Informe um valor válido para a assinatura';
  end if;

  if new.ativo then
    -- vigência padrão: 30 dias a partir do início
    new.fim := new.inicio + (new.vigencia_dias || ' days')::interval;
  end if;

  if new.fim is not null and new.fim < new.inicio then
    raise exception 'A data final não pode ser anterior à data inicial';
  end if;

  return new;
end;
$$;

-- Preenche o vencimento das assinaturas ativas já existentes.
update public.empresa_assinaturas
   set fim = inicio + (coalesce(vigencia_dias, 30) || ' days')::interval
 where ativo
   and fim is null;
