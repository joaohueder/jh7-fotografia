-- =====================================================================
-- JH7 Gestão Fotográfica — MÓDULO USUÁRIOS (painel SA)
-- Rode este script no seu Supabase AUTOHOSPEDADO (SQL Editor),
-- depois de 09_bloqueio_login.sql.
--
-- Entrega uma RPC que lista todos os usuários do sistema com o seu
-- tipo (sa_admin / admin / usuario), e-mail e empresa vinculada.
-- Acesso restrito ao sa_admin.
-- =====================================================================

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
  created_at timestamptz
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
    u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.empresas e on e.id = p.empresa_id
  order by u.created_at desc;
end;
$$;

revoke all on function public.sa_listar_usuarios() from public, anon;
grant execute on function public.sa_listar_usuarios() to authenticated;

-- Ativar / inativar um usuário -----------------------------------------
create or replace function public.sa_set_usuario_ativo(p_id uuid, p_ativo boolean)
returns void
language plpgsql
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

  if p_id = auth.uid() then
    raise exception 'Você não pode inativar o seu próprio usuário.';
  end if;

  insert into public.profiles (id, ativo)
  values (p_id, p_ativo)
  on conflict (id) do update set ativo = excluded.ativo, updated_at = now();
end;
$$;

revoke all on function public.sa_set_usuario_ativo(uuid, boolean) from public, anon;
grant execute on function public.sa_set_usuario_ativo(uuid, boolean) to authenticated;
