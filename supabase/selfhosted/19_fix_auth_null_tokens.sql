-- ============================================================
-- 19_fix_auth_null_tokens.sql
-- Corrige o erro de login "Database error querying schema"
-- (GoTrue: converting NULL to string is unsupported)
--
-- Causa: usuários criados manualmente via SQL (insert em auth.users)
-- ficam com colunas de token NULL. O GoTrue não aceita NULL nesses
-- campos e falha com erro 500 em qualquer tentativa de login.
--
-- Rode este script inteiro no SQL Editor do seu Supabase autohospedado.
-- ============================================================

-- 1) Backfill: troca NULL por string vazia em todos os usuários
update auth.users set
  confirmation_token      = coalesce(confirmation_token, ''),
  recovery_token          = coalesce(recovery_token, ''),
  email_change            = coalesce(email_change, ''),
  email_change_token_new  = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change            = coalesce(phone_change, ''),
  phone_change_token      = coalesce(phone_change_token, ''),
  reauthentication_token  = coalesce(reauthentication_token, '')
where confirmation_token is null
   or recovery_token is null
   or email_change is null
   or email_change_token_new is null
   or email_change_token_current is null
   or phone_change is null
   or phone_change_token is null
   or reauthentication_token is null;

-- 2) Garante e-mail confirmado (login com senha exige confirmação)
update auth.users
   set email_confirmed_at = coalesce(email_confirmed_at, now()),
       confirmed_at_dummy = null
 where false; -- no-op de segurança (confirmed_at é coluna gerada)

update auth.users
   set email_confirmed_at = now()
 where email_confirmed_at is null;

-- 3) Garante identidade 'email' para quem não tem
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', lower(u.email)),
       'email', now(), now(), now()
from auth.users u
where u.email is not null
  and not exists (
    select 1 from auth.identities i
     where i.user_id = u.id and i.provider = 'email'
  );

-- 4) Defaults na tabela para evitar que o problema volte
alter table auth.users alter column confirmation_token set default '';
alter table auth.users alter column recovery_token set default '';
alter table auth.users alter column email_change set default '';
alter table auth.users alter column email_change_token_new set default '';
alter table auth.users alter column email_change_token_current set default '';
alter table auth.users alter column phone_change set default '';
alter table auth.users alter column phone_change_token set default '';
alter table auth.users alter column reauthentication_token set default '';

-- 5) Conferência
select email, email_confirmed_at is not null as confirmado,
       (confirmation_token is null or recovery_token is null) as tem_null
from auth.users
order by created_at desc;
