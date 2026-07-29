-- =====================================================================
-- JH7 Gestão Fotográfica — PLANOS: ordenação manual (drag and drop)
-- Rode este script no seu Supabase AUTOHOSPEDADO (SQL Editor),
-- depois de 13_planos_campos.sql.
-- =====================================================================

alter table public.planos
  add column if not exists ordem integer;

-- Preenche a ordem inicial pelos planos já existentes (alfabética).
with numerados as (
  select id, row_number() over (order by nome) as pos
  from public.planos
  where ordem is null
)
update public.planos p
set ordem = n.pos
from numerados n
where p.id = n.id;

-- Novos planos entram no fim da lista.
create or replace function public.planos_define_ordem()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.ordem is null then
    select coalesce(max(ordem), 0) + 1 into new.ordem from public.planos;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_planos_define_ordem on public.planos;
create trigger trg_planos_define_ordem
  before insert on public.planos
  for each row execute function public.planos_define_ordem();

create index if not exists planos_ordem_idx on public.planos (ordem);
