-- =====================================================================
-- JH7 Gestão Fotográfica — LOGOFF REMOTO DE USUÁRIOS (painel SA)
-- Rode este script no seu Supabase AUTOHOSPEDADO (SQL Editor),
-- depois de 20_usuarios.sql.
--
-- Permite que o sa_admin encerre todas as sessões ativas de um usuário
-- (logoff forçado). O usuário é desconectado assim que o token de acesso
-- atual expirar ou na próxima renovação (refresh), o que vier antes.
-- =====================================================================

create or replace function public.sa_logoff_usuario(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_sessoes integer := 0;
begin
  if not exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role = 'sa_admin'
  ) then
    raise exception 'Acesso restrito ao administrador do SaaS.';
  end if;

  if p_id = auth.uid() then
    raise exception 'Use o menu Sair para encerrar a sua própria sessão.';
  end if;

  -- Revoga os refresh tokens (impede renovar a sessão)
  update auth.refresh_tokens
     set revoked = true
   where user_id = (select u.email from auth.users u where u.id = p_id)
      or user_id = p_id::text;

  -- Remove as sessões ativas
  with removidas as (
    delete from auth.sessions where user_id = p_id returning 1
  )
  select count(*)::int into v_sessoes from removidas;

  return coalesce(v_sessoes, 0);
end;
$$;

revoke all on function public.sa_logoff_usuario(uuid) from public, anon;
grant execute on function public.sa_logoff_usuario(uuid) to authenticated;
