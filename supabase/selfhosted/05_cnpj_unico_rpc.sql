-- =====================================================================
-- PATCH: Validação de CPF/CNPJ duplicado ao sair do campo
-- Rode no SQL Editor do seu Supabase autohospedado.
-- =====================================================================

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
