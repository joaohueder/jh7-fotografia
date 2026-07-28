-- =====================================================================
-- JH7 Gestão Fotográfica — Módulo EMPRESAS (SaaS)
-- Rode este script no seu Supabase AUTOHOSPEDADO (SQL Editor).
-- Pré-requisitos: tabelas public.profiles, public.user_roles e a função
-- public.has_role(uuid, app_role) já criadas (scripts anteriores).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Status da empresa
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'empresa_status') then
    create type public.empresa_status as enum ('ATIVO', 'INATIVO');
  end if;
end$$;

-- ---------------------------------------------------------------------
-- Tabela principal
-- ---------------------------------------------------------------------
create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),

  -- dados da empresa
  razao_social text not null,
  nome_fantasia text not null,
  cnpj text not null unique,
  status public.empresa_status not null default 'ATIVO',
  cep text,
  endereco text,
  complemento text,
  numero text,
  bairro text,
  cidade text,
  uf text,

  -- dados do responsável
  resp_nome text not null,
  resp_nascimento date,
  resp_cpf text,
  resp_cep text,
  resp_endereco text,
  resp_complemento text,
  resp_numero text,
  resp_bairro text,
  resp_cidade text,
  resp_uf text,
  resp_whatsapp text,
  resp_email text,

  -- contatos principais
  contato_whatsapp text,
  contato_email text,

  observacoes text,

  -- usuário admin criado junto com a empresa
  admin_user_id uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- contatos adicionais (lista infinita)
create table if not exists public.empresa_contatos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null,
  valor text not null,
  descricao text,
  created_at timestamptz not null default now()
);

create index if not exists empresa_contatos_empresa_id_idx on public.empresa_contatos(empresa_id);

-- vínculo de usuários com a empresa (usado na checagem de dependências)
alter table public.profiles
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

-- updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists empresas_set_updated_at on public.empresas;
create trigger empresas_set_updated_at
before update on public.empresas
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Grants + RLS (somente sa_admin gerencia; admin lê a própria empresa)
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.empresas to authenticated;
grant select, insert, update, delete on public.empresa_contatos to authenticated;
grant all on public.empresas to service_role;
grant all on public.empresa_contatos to service_role;

alter table public.empresas enable row level security;
alter table public.empresa_contatos enable row level security;

drop policy if exists "sa_admin gerencia empresas" on public.empresas;
create policy "sa_admin gerencia empresas" on public.empresas
for all to authenticated
using (public.has_role(auth.uid(), 'sa_admin'))
with check (public.has_role(auth.uid(), 'sa_admin'));

drop policy if exists "membros leem a propria empresa" on public.empresas;
create policy "membros leem a propria empresa" on public.empresas
for select to authenticated
using (
  id = (select p.empresa_id from public.profiles p where p.id = auth.uid())
);

drop policy if exists "sa_admin gerencia contatos" on public.empresa_contatos;
create policy "sa_admin gerencia contatos" on public.empresa_contatos
for all to authenticated
using (public.has_role(auth.uid(), 'sa_admin'))
with check (public.has_role(auth.uid(), 'sa_admin'));

drop policy if exists "membros leem contatos da propria empresa" on public.empresa_contatos;
create policy "membros leem contatos da propria empresa" on public.empresa_contatos
for select to authenticated
using (
  empresa_id = (select p.empresa_id from public.profiles p where p.id = auth.uid())
);

-- ---------------------------------------------------------------------
-- RPC: criar empresa + usuário admin
-- ---------------------------------------------------------------------
create or replace function public.sa_create_empresa(
  p_empresa jsonb,
  p_contatos jsonb default '[]'::jsonb,
  p_email text default null,
  p_password text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_empresa_id uuid;
  v_user_id uuid;
  v_instance uuid;
begin
  if not public.has_role(auth.uid(), 'sa_admin') then
    raise exception 'Acesso negado';
  end if;

  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'E-mail de acesso é obrigatório';
  end if;
  if p_password is null or length(p_password) < 8 then
    raise exception 'A senha deve ter pelo menos 8 caracteres';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = lower(p_email)) then
    raise exception 'Já existe um usuário com este e-mail';
  end if;

  select coalesce((select instance_id from auth.users limit 1), '00000000-0000-0000-0000-000000000000'::uuid)
    into v_instance;

  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    v_instance, v_user_id, 'authenticated', 'authenticated', lower(trim(p_email)),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_empresa->>'resp_nome'),
    now(), now()
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id, v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(p_email))),
    'email', now(), now(), now()
  );

  insert into public.empresas (
    razao_social, nome_fantasia, cnpj, status, cep, endereco, complemento, numero,
    bairro, cidade, uf, resp_nome, resp_nascimento, resp_cpf, resp_cep, resp_endereco,
    resp_complemento, resp_numero, resp_bairro, resp_cidade, resp_uf, resp_whatsapp,
    resp_email, contato_whatsapp, contato_email, observacoes, admin_user_id
  )
  select
    e.razao_social, e.nome_fantasia, e.cnpj, coalesce(e.status, 'ATIVO'), e.cep, e.endereco,
    e.complemento, e.numero, e.bairro, e.cidade, e.uf, e.resp_nome, e.resp_nascimento,
    e.resp_cpf, e.resp_cep, e.resp_endereco, e.resp_complemento, e.resp_numero, e.resp_bairro,
    e.resp_cidade, e.resp_uf, e.resp_whatsapp, e.resp_email, e.contato_whatsapp,
    e.contato_email, e.observacoes, v_user_id
  from jsonb_to_record(p_empresa) as e(
    razao_social text, nome_fantasia text, cnpj text, status public.empresa_status,
    cep text, endereco text, complemento text, numero text, bairro text, cidade text, uf text,
    resp_nome text, resp_nascimento date, resp_cpf text, resp_cep text, resp_endereco text,
    resp_complemento text, resp_numero text, resp_bairro text, resp_cidade text, resp_uf text,
    resp_whatsapp text, resp_email text, contato_whatsapp text, contato_email text,
    observacoes text
  )
  returning id into v_empresa_id;

  insert into public.empresa_contatos (empresa_id, tipo, valor, descricao)
  select v_empresa_id, c.tipo, c.valor, c.descricao
  from jsonb_to_recordset(coalesce(p_contatos, '[]'::jsonb))
    as c(tipo text, valor text, descricao text)
  where coalesce(trim(c.valor), '') <> '';

  insert into public.profiles (id, full_name, display_name, empresa_id)
  values (v_user_id, p_empresa->>'resp_nome', p_empresa->>'nome_fantasia', v_empresa_id)
  on conflict (id) do update
    set empresa_id = excluded.empresa_id,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);

  insert into public.user_roles (user_id, role)
  values (v_user_id, 'admin')
  on conflict (user_id, role) do nothing;

  return v_empresa_id;
end$$;

revoke all on function public.sa_create_empresa(jsonb, jsonb, text, text) from public, anon;
grant execute on function public.sa_create_empresa(jsonb, jsonb, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: atualizar empresa (+ contatos, + senha opcional)
-- ---------------------------------------------------------------------
create or replace function public.sa_update_empresa(
  p_id uuid,
  p_empresa jsonb,
  p_contatos jsonb default '[]'::jsonb,
  p_password text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_admin uuid;
begin
  if not public.has_role(auth.uid(), 'sa_admin') then
    raise exception 'Acesso negado';
  end if;

  update public.empresas e set
    razao_social = n.razao_social,
    nome_fantasia = n.nome_fantasia,
    cnpj = n.cnpj,
    status = coalesce(n.status, 'ATIVO'),
    cep = n.cep, endereco = n.endereco, complemento = n.complemento, numero = n.numero,
    bairro = n.bairro, cidade = n.cidade, uf = n.uf,
    resp_nome = n.resp_nome, resp_nascimento = n.resp_nascimento, resp_cpf = n.resp_cpf,
    resp_cep = n.resp_cep, resp_endereco = n.resp_endereco, resp_complemento = n.resp_complemento,
    resp_numero = n.resp_numero, resp_bairro = n.resp_bairro, resp_cidade = n.resp_cidade,
    resp_uf = n.resp_uf, resp_whatsapp = n.resp_whatsapp, resp_email = n.resp_email,
    contato_whatsapp = n.contato_whatsapp, contato_email = n.contato_email,
    observacoes = n.observacoes
  from jsonb_to_record(p_empresa) as n(
    razao_social text, nome_fantasia text, cnpj text, status public.empresa_status,
    cep text, endereco text, complemento text, numero text, bairro text, cidade text, uf text,
    resp_nome text, resp_nascimento date, resp_cpf text, resp_cep text, resp_endereco text,
    resp_complemento text, resp_numero text, resp_bairro text, resp_cidade text, resp_uf text,
    resp_whatsapp text, resp_email text, contato_whatsapp text, contato_email text,
    observacoes text
  )
  where e.id = p_id
  returning e.admin_user_id into v_admin;

  if not found then
    raise exception 'Empresa não encontrada';
  end if;

  delete from public.empresa_contatos where empresa_id = p_id;
  insert into public.empresa_contatos (empresa_id, tipo, valor, descricao)
  select p_id, c.tipo, c.valor, c.descricao
  from jsonb_to_recordset(coalesce(p_contatos, '[]'::jsonb))
    as c(tipo text, valor text, descricao text)
  where coalesce(trim(c.valor), '') <> '';

  if p_password is not null and length(p_password) > 0 and v_admin is not null then
    if length(p_password) < 8 then
      raise exception 'A senha deve ter pelo menos 8 caracteres';
    end if;
    update auth.users
       set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
           updated_at = now()
     where id = v_admin;
  end if;

  return p_id;
end$$;

revoke all on function public.sa_update_empresa(uuid, jsonb, jsonb, text) from public, anon;
grant execute on function public.sa_update_empresa(uuid, jsonb, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: dependências da empresa (usado antes de excluir)
-- ---------------------------------------------------------------------
create or replace function public.sa_empresa_dependencias(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_usuarios int;
begin
  if not public.has_role(auth.uid(), 'sa_admin') then
    raise exception 'Acesso negado';
  end if;

  select count(*) into v_usuarios
  from public.profiles p
  join public.empresas e on e.id = p_id
  where p.empresa_id = p_id
    and (e.admin_user_id is null or p.id <> e.admin_user_id);

  return jsonb_build_object('usuarios', v_usuarios);
end$$;

revoke all on function public.sa_empresa_dependencias(uuid) from public, anon;
grant execute on function public.sa_empresa_dependencias(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: excluir empresa (bloqueia se houver dependências)
-- ---------------------------------------------------------------------
create or replace function public.sa_delete_empresa(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin uuid;
  v_usuarios int;
begin
  if not public.has_role(auth.uid(), 'sa_admin') then
    raise exception 'Acesso negado';
  end if;

  select admin_user_id into v_admin from public.empresas where id = p_id;
  if not found then
    raise exception 'Empresa não encontrada';
  end if;

  select count(*) into v_usuarios
  from public.profiles p
  where p.empresa_id = p_id and (v_admin is null or p.id <> v_admin);

  if v_usuarios > 0 then
    raise exception 'Não é possível excluir: a empresa possui % usuário(s) vinculado(s).', v_usuarios;
  end if;

  delete from public.empresas where id = p_id;

  if v_admin is not null then
    delete from public.user_roles where user_id = v_admin;
    delete from public.profiles where id = v_admin;
    delete from auth.users where id = v_admin;
  end if;
end$$;

revoke all on function public.sa_delete_empresa(uuid) from public, anon;
grant execute on function public.sa_delete_empresa(uuid) to authenticated;
