-- =====================================================================
-- JH7 — CORREÇÃO: usuários criados pela RPC não conseguem logar
-- Causa: o GoTrue (Auth) lê as colunas de token de auth.users como texto.
-- Quando elas ficam NULL (inserção manual via SQL), o login falha com
-- "Database error querying schema" / erro 500.
-- Solução: preencher com string vazia e garantir isso nas próximas criações.
-- Rode este script inteiro no SQL Editor do seu Supabase autohospedado.
-- =====================================================================

-- 1) Corrige TODOS os usuários já existentes ---------------------------
update auth.users
set
  confirmation_token       = coalesce(confirmation_token, ''),
  recovery_token           = coalesce(recovery_token, ''),
  email_change             = coalesce(email_change, ''),
  email_change_token_new   = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change             = coalesce(phone_change, ''),
  phone_change_token       = coalesce(phone_change_token, ''),
  reauthentication_token   = coalesce(reauthentication_token, ''),
  email_confirmed_at       = coalesce(email_confirmed_at, now()),
  -- confirmed_at é coluna gerada nas versões novas do Supabase: NÃO atualizar
  aud                      = coalesce(nullif(aud, ''), 'authenticated'),
  role                     = coalesce(nullif(role, ''), 'authenticated'),
  is_sso_user              = coalesce(is_sso_user, false),
  is_anonymous             = coalesce(is_anonymous, false),
  raw_app_meta_data        = coalesce(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
  raw_user_meta_data       = coalesce(raw_user_meta_data, '{}'::jsonb)
where confirmation_token is null
   or recovery_token is null
   or email_change is null
   or email_change_token_new is null
   or email_change_token_current is null
   or phone_change is null
   or phone_change_token is null
   or reauthentication_token is null
   or email_confirmed_at is null
   or aud is null or aud = ''
   or role is null or role = ''
   or is_sso_user is null
   or is_anonymous is null;

-- 2) Garante a identidade (auth.identities) para login por e-mail ------
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email is not null
  and not exists (
    select 1 from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  );

-- 3) Redefine a senha do usuário informado (troque se necessário) ------
update auth.users
set encrypted_password = extensions.crypt('123456789', extensions.gen_salt('bf')),
    updated_at = now()
where lower(email) = lower('joaohueder2@gmail.com');

-- 4) Atualiza a RPC de criação para nunca mais gerar usuário quebrado --
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
  v_email text;
begin
  if not public.has_role(auth.uid(), 'sa_admin') then
    raise exception 'Acesso negado';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));

  if length(v_email) = 0 then
    raise exception 'E-mail de acesso é obrigatório';
  end if;
  if p_password is null or length(p_password) < 8 then
    raise exception 'A senha deve ter pelo menos 8 caracteres';
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'Já existe um usuário com este e-mail';
  end if;

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
    email_confirmed_at, confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, is_sso_user, is_anonymous,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token,
    created_at, updated_at
  ) values (
    v_instance, v_user_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_empresa->>'resp_nome', 'email_verified', true),
    false, false, false,
    '', '', '', '', '', '', '', '',
    now(), now()
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id, v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
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

-- 5) Conferência: deve retornar o usuário pronto para logar ------------
-- select email, email_confirmed_at, aud, role,
--        (encrypted_password is not null) as tem_senha,
--        (select count(*) from auth.identities i where i.user_id = u.id) as identidades
-- from auth.users u where lower(email) = lower('joaohueder2@gmail.com');
