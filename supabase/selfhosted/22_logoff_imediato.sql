-- =====================================================================
-- JH7 Gestão Fotográfica — LOGOFF IMEDIATO (painel SA)
-- Rode no Supabase AUTOHOSPEDADO depois de 21_logoff_usuario.sql.
--
-- Apagar as sessões no banco não invalida o access token (JWT) que já
-- está no navegador do usuário — ele continuaria navegando até o token
-- expirar. Aqui registramos o instante da revogação e expomos uma RPC
-- que o front consulta periodicamente para deslogar na hora.
-- =====================================================================

create table if not exists public.sessoes_revogadas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revogado_em timestamptz not null default now()
);

alter table public.sessoes_revogadas enable row level security;

grant select on public.sessoes_revogadas to authenticated;
grant all on public.sessoes_revogadas to service_role;

drop policy if exists "Usuário vê sua própria revogação" on public.sessoes_revogadas;
create policy "Usuário vê sua própria revogação"
  on public.sessoes_revogadas for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Logoff forçado: revoga refresh tokens, apaga sessões e marca o instante
-- ---------------------------------------------------------------------
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

  -- Marca o instante da revogação (usado pelo front para deslogar na hora)
  insert into public.sessoes_revogadas (user_id, revogado_em)
  values (p_id, now())
  on conflict (user_id) do update set revogado_em = excluded.revogado_em;

  return coalesce(v_sessoes, 0);
end;
$$;

revoke all on function public.sa_logoff_usuario(uuid) from public, anon;
grant execute on function public.sa_logoff_usuario(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- O token atual ainda é válido? (false => front faz signOut imediato)
-- ---------------------------------------------------------------------
create or replace function public.minha_sessao_valida()
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_iat timestamptz;
  v_revogado timestamptz;
begin
  if v_uid is null then
    return false;
  end if;

  select revogado_em into v_revogado
    from public.sessoes_revogadas where user_id = v_uid;

  if v_revogado is null then
    return true;
  end if;

  -- "iat" do JWT: quando este access token foi emitido
  begin
    v_iat := to_timestamp((auth.jwt() ->> 'iat')::bigint);
  exception when others then
    v_iat := null;
  end;

  if v_iat is null then
    return false;
  end if;

  -- Token emitido antes da revogação => inválido
  return v_iat > v_revogado;
end;
$$;

revoke all on function public.minha_sessao_valida() from public, anon;
grant execute on function public.minha_sessao_valida() to authenticated;
