-- =====================================================================
-- 29 — Notas internas do cliente/lead
-- Histórico de anotações (interesse do lead, combinados, retornos...).
-- Cada nota guarda quem escreveu e em qual módulo do sistema foi criada.
-- =====================================================================

create table if not exists public.cliente_notas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  descricao text not null,
  modulo text not null default 'CLIENTES',
  criado_por uuid,
  criado_por_nome text,
  created_at timestamptz not null default now()
);

alter table public.cliente_notas drop constraint if exists cliente_notas_modulo_chk;
alter table public.cliente_notas
  add constraint cliente_notas_modulo_chk check (modulo in ('CLIENTES', 'LEADS'));

create index if not exists cliente_notas_cliente_idx
  on public.cliente_notas (cliente_id, created_at desc);

-- ---------------------------------------------------------------------
-- Permissões e RLS
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.cliente_notas to authenticated;

alter table public.cliente_notas enable row level security;

drop policy if exists "notas dos clientes da própria empresa" on public.cliente_notas;
create policy "notas dos clientes da própria empresa"
  on public.cliente_notas for all to authenticated
  using (
    exists (
      select 1 from public.clientes c
      where c.id = cliente_id and public.pode_acessar_empresa(c.empresa_id)
    )
  )
  with check (
    exists (
      select 1 from public.clientes c
      where c.id = cliente_id and public.pode_acessar_empresa(c.empresa_id)
    )
  );
