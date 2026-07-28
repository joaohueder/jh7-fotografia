-- =====================================================================
-- JH7 Gestão Fotográfica — Verificação de e-mail já cadastrado
-- Rode este script no seu Supabase AUTOHOSPEDADO (SQL Editor).
-- =====================================================================

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
