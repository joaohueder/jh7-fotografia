-- =====================================================================
-- 30 — Tipo da nota (interesse do lead x nota comum)
-- A primeira anotação feita no cadastro do lead é o "interesse do lead":
-- o motivo pelo qual a pessoa entrou em contato. As demais são notas
-- normais de movimentação/histórico.
-- =====================================================================

alter table public.cliente_notas
  add column if not exists tipo text not null default 'NOTA';

alter table public.cliente_notas drop constraint if exists cliente_notas_tipo_chk;
alter table public.cliente_notas
  add constraint cliente_notas_tipo_chk check (tipo in ('NOTA', 'INTERESSE'));

-- Marca a nota mais antiga de cada lead como o interesse inicial.
with primeira as (
  select distinct on (n.cliente_id) n.id
  from public.cliente_notas n
  join public.clientes c on c.id = n.cliente_id
  where c.origem = 'LEAD'
  order by n.cliente_id, n.created_at asc
)
update public.cliente_notas n
set tipo = 'INTERESSE'
from primeira p
where p.id = n.id and n.tipo <> 'INTERESSE';

create index if not exists cliente_notas_tipo_idx
  on public.cliente_notas (cliente_id, tipo);
