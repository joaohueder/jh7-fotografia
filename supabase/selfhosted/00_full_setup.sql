-- =====================================================================
-- JH7 Gestão Fotográfica — SCRIPT ÚNICO E COMPLETO
-- Rode ESTE arquivo no SQL Editor do seu Supabase AUTOHOSPEDADO.
-- Pode ser executado mais de uma vez (é idempotente).
-- Cobre: profiles, user_roles, has_role, empresas, contatos e RPCs.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- =====================================================================
-- 1) PERFIS
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  avatar_url text,
  studio_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

drop policy if exists "Users can manage own profile" on public.profiles;
create policy "Users can manage own profile" on public.profiles
for all to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- =====================================================================
-- 2) PAPÉIS DE USUÁRIO (sa_admin / admin / usuario)
-- =====================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('sa_admin', 'admin', 'usuario');
  end if;
end$$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;

drop policy if exists "Usuario le os proprios papeis" on public.user_roles;
create policy "Usuario le os proprios papeis" on public.user_roles
for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(), 'sa_admin'));

-- =====================================================================
-- 3) TRIGGER: cria perfil + papel padrão no cadastro
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, display_name)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'usuario')
  on conflict (user_id, role) do nothing;

  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =====================================================================
-- 4) EMPRESAS
-- =====================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'empresa_status') then
    create type public.empresa_status as enum ('ATIVO', 'INATIVO');
  end if;
end$$;

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
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
  contato_whatsapp text,
  contato_email text,
  observacoes text,
  admin_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.empresa_contatos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null,
  valor text not null,
  descricao text,
  created_at timestamptz not null default now()
);

create index if not exists empresa_contatos_empresa_id_idx on public.empresa_contatos(empresa_id);

alter table public.profiles
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

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
using (id = (select p.empresa_id from public.profiles p where p.id = auth.uid()));

drop policy if exists "sa_admin gerencia contatos" on public.empresa_contatos;
create policy "sa_admin gerencia contatos" on public.empresa_contatos
for all to authenticated
using (public.has_role(auth.uid(), 'sa_admin'))
with check (public.has_role(auth.uid(), 'sa_admin'));

drop policy if exists "membros leem contatos da propria empresa" on public.empresa_contatos;
create policy "membros leem contatos da propria empresa" on public.empresa_contatos
for select to authenticated
using (empresa_id = (select p.empresa_id from public.profiles p where p.id = auth.uid()));

-- =====================================================================
-- 5) RPCs — remove versões antigas antes de recriar
-- =====================================================================
drop function if exists public.sa_create_empresa(jsonb, jsonb, text, text);
drop function if exists public.sa_update_empresa(uuid, jsonb, jsonb, text);
drop function if exists public.sa_empresa_dependencias(uuid);
drop function if exists public.sa_delete_empresa(uuid);
drop function if exists public.sa_email_exists(text);

-- ---------- criar empresa + usuário admin --------------------------
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
  if exists (select 1 from auth.users u where lower(u.email) = lower(trim(p_email))) then
    raise exception 'Já existe um usuário com este e-mail';
  end if;

  -- IMPORTANTE: nada de min(instance_id) — uuid não suporta min()
  select coalesce(
    (select u.instance_id
       from auth.users u
      where u.instance_id is not null
      order by u.created_at asc
      limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) into v_instance;

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

  delete from public.user_roles where user_id = v_user_id and role = 'usuario';

  insert into public.user_roles (user_id, role)
  values (v_user_id, 'admin')
  on conflict (user_id, role) do nothing;

  return v_empresa_id;
end$$;

revoke all on function public.sa_create_empresa(jsonb, jsonb, text, text) from public, anon;
grant execute on function public.sa_create_empresa(jsonb, jsonb, text, text) to authenticated;

-- ---------- atualizar empresa --------------------------------------
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

-- ---------- dependências da empresa --------------------------------
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

-- ---------- excluir empresa ----------------------------------------
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

-- ---------- verificar e-mail já cadastrado -------------------------
create or replace function public.sa_email_exists(p_email text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.has_role(auth.uid(), 'sa_admin') then
    raise exception 'Acesso negado';
  end if;

  if p_email is null or length(trim(p_email)) = 0 then
    return false;
  end if;

  return exists (
    select 1 from auth.users u where lower(u.email) = lower(trim(p_email))
  );
end$$;

revoke all on function public.sa_email_exists(text) from public, anon;
grant execute on function public.sa_email_exists(text) to authenticated;

-- ---------- verificar cpf/cnpj já cadastrado ------------------------
create or replace function public.sa_cnpj_exists(p_cnpj text, p_ignore_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_digits text;
begin
  if not public.has_role(auth.uid(), 'sa_admin') then
    raise exception 'Acesso negado';
  end if;

  if p_cnpj is null or length(trim(p_cnpj)) = 0 then
    return false;
  end if;

  v_digits := regexp_replace(p_cnpj, '\D', '', 'g');

  return exists (
    select 1
    from public.empresas e
    where regexp_replace(e.cnpj, '\D', '', 'g') = v_digits
      and (p_ignore_id is null or e.id <> p_ignore_id)
  );
end$$;

revoke all on function public.sa_cnpj_exists(text, uuid) from public, anon;
grant execute on function public.sa_cnpj_exists(text, uuid) to authenticated;

-- =====================================================================
-- 6) DEFINA SEU USUÁRIO SUPER ADMIN
-- Troque o e-mail abaixo pelo do seu usuário já cadastrado e rode.
-- =====================================================================
-- insert into public.user_roles (user_id, role)
-- select id, 'sa_admin' from auth.users where lower(email) = lower('seu@email.com')
-- on conflict (user_id, role) do nothing;
