-- =====================================================================
-- JH7 — BLOQUEIO DE LOGIN PARA USUÁRIO/EMPRESA INATIVOS
-- Rode este script no SQL Editor do seu Supabase autohospedado.
-- =====================================================================

-- 1) Flag de usuário ativo/inativo no perfil ---------------------------
alter table public.profiles
  add column if not exists ativo boolean not null default true;

-- 2) Função que informa se o usuário logado pode acessar o sistema ----
--    Regras:
--      * sa_admin sempre pode acessar
--      * perfil com ativo = false  -> bloqueado
--      * usuário vinculado a uma empresa INATIVA -> bloqueado
create or replace function public.meu_acesso()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_ativo boolean;
  v_empresa_inativa boolean;
begin
  if v_uid is null then
    return jsonb_build_object('ativo', false, 'motivo', 'Sessão inválida.');
  end if;

  if exists (
    select 1 from public.user_roles r
    where r.user_id = v_uid and r.role = 'sa_admin'
  ) then
    return jsonb_build_object('ativo', true, 'motivo', null);
  end if;

  select coalesce(p.ativo, true) into v_ativo
  from public.profiles p where p.id = v_uid;

  if coalesce(v_ativo, true) = false then
    return jsonb_build_object(
      'ativo', false,
      'motivo', 'Seu usuário está inativo. Fale com o administrador.'
    );
  end if;

  select exists (
    select 1 from public.empresas e
    where e.admin_user_id = v_uid
      and e.status = 'INATIVO'
  ) into v_empresa_inativa;

  if v_empresa_inativa then
    return jsonb_build_object(
      'ativo', false,
      'motivo', 'A empresa está inativa. Fale com o suporte JH7.'
    );
  end if;

  return jsonb_build_object('ativo', true, 'motivo', null);
end$$;

revoke all on function public.meu_acesso() from public, anon;
grant execute on function public.meu_acesso() to authenticated;
