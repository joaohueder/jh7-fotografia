-- =====================================================================
-- JH7 — RPC: e-mail de acesso do administrador da empresa
-- Usado na tela de edição para exibir o e-mail do usuário (somente leitura).
-- Rode no SQL Editor do seu Supabase autohospedado.
-- =====================================================================

create or replace function public.sa_empresa_admin_email(p_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  if not public.has_role(auth.uid(), 'sa_admin') then
    raise exception 'Acesso negado';
  end if;

  select u.email into v_email
  from public.empresas e
  join auth.users u on u.id = e.admin_user_id
  where e.id = p_id;

  return v_email;
end$$;

revoke all on function public.sa_empresa_admin_email(uuid) from public, anon;
grant execute on function public.sa_empresa_admin_email(uuid) to authenticated;
