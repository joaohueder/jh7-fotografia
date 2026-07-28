-- =====================================================================
-- JH7 — DIAGNÓSTICO E CORREÇÃO DE LOGIN
-- Rode este script no SQL Editor do seu Supabase autohospedado.
-- O servidor de auth está respondendo normalmente; o erro
-- "invalid_credentials" significa e-mail inexistente OU senha diferente.
-- =====================================================================

-- 1) VER O ESTADO DO USUÁRIO ------------------------------------------
-- Troque o e-mail abaixo pelo que você está tentando usar no login.
select
  u.id,
  u.email,
  u.email_confirmed_at,
  u.banned_until,
  u.deleted_at,
  u.aud,
  u.role,
  (u.encrypted_password is not null) as tem_senha,
  exists (
    select 1 from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  ) as tem_identidade_email
from auth.users u
where lower(u.email) = lower('joaohueder2@gmail.com');
-- Se não retornar nenhuma linha, o e-mail não existe (veja o passo 4).

-- 2) NORMALIZA COLUNAS QUE QUEBRAM O GOTRUE ---------------------------
update auth.users
set
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change               = coalesce(email_change, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, ''),
  email_confirmed_at         = coalesce(email_confirmed_at, now()),
  banned_until               = null,
  aud                        = coalesce(nullif(aud, ''), 'authenticated'),
  role                       = coalesce(nullif(role, ''), 'authenticated'),
  is_sso_user                = coalesce(is_sso_user, false),
  is_anonymous               = coalesce(is_anonymous, false),
  raw_app_meta_data          = coalesce(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
  raw_user_meta_data         = coalesce(raw_user_meta_data, '{}'::jsonb),
  email                      = lower(trim(email))
where deleted_at is null;

-- Garante a identidade de e-mail (obrigatória para login por senha)
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

-- 3) REDEFINIR A SENHA (troque e-mail e senha) ------------------------
update auth.users
set encrypted_password = extensions.crypt('Jh7@2026Senha', extensions.gen_salt('bf')),
    updated_at = now()
where lower(email) = lower('joaohueder2@gmail.com');

-- 4) CRIAR O USUÁRIO SA_ADMIN CASO NÃO EXISTA -------------------------
do $$
declare
  v_email text := lower('joaohueder2@gmail.com');
  v_senha text := 'Jh7@2026Senha';
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = v_email;

  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token,
      is_sso_user, is_anonymous
    ) values (
      coalesce((select instance_id from auth.users limit 1),
               '00000000-0000-0000-0000-000000000000'::uuid),
      v_id, 'authenticated', 'authenticated', v_email,
      extensions.crypt(v_senha, extensions.gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', '', '', '', '', '', false, false
    );

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end if;

  -- garante o papel sa_admin
  insert into public.user_roles (user_id, role)
  values (v_id, 'sa_admin')
  on conflict (user_id, role) do nothing;
end$$;

-- 5) CONFERIR SE A SENHA BATE (deve retornar true) --------------------
select (u.encrypted_password = extensions.crypt('Jh7@2026Senha', u.encrypted_password)) as senha_confere
from auth.users u
where lower(u.email) = lower('joaohueder2@gmail.com');
