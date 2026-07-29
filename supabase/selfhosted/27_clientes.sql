-- =====================================================================
-- 27 — Módulo Clientes (painel do administrador da empresa)
-- Cada cliente pertence a uma empresa. O admin gerencia apenas os
-- clientes da própria empresa; o SA admin pode acessar qualquer empresa
-- (usado na personificação "acessar como empresa").
-- =====================================================================

-- Helper: o usuário logado pode operar dados da empresa informada?
create or replace function public.pode_acessar_empresa(p_empresa uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_empresa is not null
     and auth.uid() is not null
     and (
       public.has_role(auth.uid(), 'sa_admin')
       or exists (
         select 1 from public.profiles pr
         where pr.id = auth.uid() and pr.empresa_id = p_empresa
       )
     )
$$;

revoke all on function public.pode_acessar_empresa(uuid) from public, anon;
grant execute on function public.pode_acessar_empresa(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  nascimento date,
  status text not null default 'ATIVO',
  documento text,
  cep text,
  endereco text,
  complemento text,
  numero text,
  bairro text,
  cidade text,
  uf text,
  contato_whatsapp text,
  contato_email text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clientes_status_chk check (status in ('ATIVO', 'INATIVO'))
);

create table if not exists public.cliente_contatos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo text not null,
  valor text not null,
  descricao text,
  created_at timestamptz not null default now()
);

create index if not exists clientes_empresa_idx on public.clientes (empresa_id);
create index if not exists clientes_nome_idx on public.clientes (nome);
create index if not exists cliente_contatos_cliente_idx on public.cliente_contatos (cliente_id);

-- Documento único por empresa (quando informado)
create unique index if not exists clientes_documento_unico
  on public.clientes (empresa_id, regexp_replace(documento, '\D', '', 'g'))
  where documento is not null and length(regexp_replace(documento, '\D', '', 'g')) > 0;

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists clientes_updated_at on public.clientes;
create trigger clientes_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Permissões e RLS
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.clientes to authenticated;
grant select, insert, update, delete on public.cliente_contatos to authenticated;

alter table public.clientes enable row level security;
alter table public.cliente_contatos enable row level security;

drop policy if exists "clientes da própria empresa" on public.clientes;
create policy "clientes da própria empresa"
  on public.clientes for all to authenticated
  using (public.pode_acessar_empresa(empresa_id))
  with check (public.pode_acessar_empresa(empresa_id));

drop policy if exists "contatos dos clientes da própria empresa" on public.cliente_contatos;
create policy "contatos dos clientes da própria empresa"
  on public.cliente_contatos for all to authenticated
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
