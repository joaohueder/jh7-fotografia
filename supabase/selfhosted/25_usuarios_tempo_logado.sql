-- =====================================================================
-- JH7 Gestão Fotográfica — USUÁRIOS: há quanto tempo está logado
-- Rode no Supabase AUTOHOSPEDADO depois de 24_usuarios_logado.sql.
-- Acrescenta a coluna "sessao_desde" (início da sessão ativa mais
-- antiga) para o painel SA calcular o tempo total de login.
-- =====================================================================

drop function if exists public.sa_listar_usuarios();

create or replace function public.sa_listar_usuarios()
returns table (
  id uuid,
  email text,
  nome text,
  role text,
  ativo boolean,
  empresa_id uuid,
  empresa_nome text,
  ultimo_login timestamptz,
  created_at timestamptz,
  logado boolean,
  sessao_em timestamptz,
  sessao_desde timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role = 'sa_admin'
  ) then
    raise exception 'Acesso restrito ao administrador do SaaS.';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(nullif(p.full_name, ''), nullif(p.display_name, ''), u.email::text) as nome,
    coalesce(
      (
        select r.role::text
        from public.user_roles r
        where r.user_id = u.id
        order by case r.role::text
          when 'sa_admin' then 1
          when 'admin' then 2
          else 3
        end
        limit 1
      ),
      'sem_papel'
    ) as role,
    coalesce(p.ativo, true) as ativo,
    p.empresa_id,
    e.nome_fantasia::text as empresa_nome,
    u.last_sign_in_at,
    u.created_at,
    coalesce(s.tem_sessao, false) as logado,
    s.sessao_em,
    s.sessao_desde
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.empresas e on e.id = p.empresa_id
  left join lateral (
    select true as tem_sessao,
           max(coalesce(x.refreshed_at, x.updated_at, x.created_at)) as sessao_em,
           min(x.created_at) as sessao_desde
      from auth.sessions x
     where x.user_id = u.id
       and (x.not_after is null or x.not_after > now())
    having count(*) > 0
  ) s on true
  order by u.created_at desc;
end;
$$;

revoke all on function public.sa_listar_usuarios() from public, anon;
grant execute on function public.sa_listar_usuarios() to authenticated;
