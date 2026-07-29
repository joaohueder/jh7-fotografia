-- =====================================================================
-- JH7 Gestão Fotográfica — REGRA DE LOGIN COM ASSINATURA ATIVA
-- Rode depois de 17_assinaturas_vigencia.sql.
--
-- Regras:
--  * meu_acesso() passa a informar o papel, a empresa e se existe
--    assinatura ativa e dentro da vigência;
--  * o admin da empresa pode contratar/renovar um plano sozinho
--    (RPC admin_contratar_assinatura), somente para a própria empresa.
-- =====================================================================

-- 1) Acesso do usuário logado ------------------------------------------
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
  v_empresa_id uuid;
  v_empresa_status text;
  v_role text;
  v_assinatura boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('ativo', false, 'motivo', 'Sessão inválida.');
  end if;

  select r.role::text into v_role
  from public.user_roles r
  where r.user_id = v_uid
  order by case r.role::text
             when 'sa_admin' then 1
             when 'admin' then 2
             else 3
           end
  limit 1;

  if v_role = 'sa_admin' then
    return jsonb_build_object(
      'ativo', true,
      'motivo', null,
      'role', 'sa_admin',
      'empresa_id', null,
      'assinatura_ativa', true
    );
  end if;

  select coalesce(p.ativo, true), p.empresa_id
    into v_ativo, v_empresa_id
  from public.profiles p where p.id = v_uid;

  if coalesce(v_ativo, true) = false then
    return jsonb_build_object(
      'ativo', false,
      'motivo', 'Seu usuário está inativo. Fale com o administrador.',
      'role', v_role
    );
  end if;

  -- empresa do admin quando o perfil ainda não tem o vínculo preenchido
  if v_empresa_id is null then
    select e.id into v_empresa_id
      from public.empresas e
     where e.admin_user_id = v_uid
     limit 1;
  end if;

  select e.status into v_empresa_status
    from public.empresas e where e.id = v_empresa_id;

  if v_empresa_status = 'INATIVO' then
    return jsonb_build_object(
      'ativo', false,
      'motivo', 'A empresa está inativa. Fale com o suporte JH7.',
      'role', v_role,
      'empresa_id', v_empresa_id
    );
  end if;

  if v_empresa_id is not null then
    select exists (
      select 1 from public.empresa_assinaturas a
      where a.empresa_id = v_empresa_id
        and a.ativo
        and (a.fim is null or a.fim >= current_date)
    ) into v_assinatura;
  end if;

  return jsonb_build_object(
    'ativo', true,
    'motivo', null,
    'role', v_role,
    'empresa_id', v_empresa_id,
    'assinatura_ativa', v_assinatura
  );
end$$;

revoke all on function public.meu_acesso() from public, anon;
grant execute on function public.meu_acesso() to authenticated;

-- 2) Contratação de plano pelo admin da própria empresa ----------------
create or replace function public.admin_contratar_assinatura(
  p_plano_id uuid,
  p_observacao text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_empresa_id uuid;
  v_plano public.planos%rowtype;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Sessão inválida';
  end if;

  if not public.has_role(v_uid, 'admin') then
    raise exception 'Acesso negado';
  end if;

  select e.id into v_empresa_id
    from public.empresas e
   where e.admin_user_id = v_uid
   limit 1;

  if v_empresa_id is null then
    select p.empresa_id into v_empresa_id
      from public.profiles p where p.id = v_uid;
  end if;

  if v_empresa_id is null then
    raise exception 'Empresa não encontrada para este administrador';
  end if;

  if exists (
    select 1 from public.empresas e
     where e.id = v_empresa_id and e.status = 'INATIVO'
  ) then
    raise exception 'A empresa está inativa. Fale com o suporte JH7.';
  end if;

  select * into v_plano from public.planos where id = p_plano_id;
  if not found then
    raise exception 'Plano não encontrado';
  end if;
  if not v_plano.ativo then
    raise exception 'Este plano está inativo e não pode ser contratado';
  end if;

  -- encerra a assinatura ativa (inclusive a vencida) antes de abrir a nova
  update public.empresa_assinaturas
     set ativo = false,
         fim = greatest(inicio, current_date)
   where empresa_id = v_empresa_id
     and ativo;

  insert into public.empresa_assinaturas
    (empresa_id, plano_id, plano_nome, gratuito, valor, ativo, inicio, observacao, criado_por)
  values
    (v_empresa_id, v_plano.id, v_plano.nome, v_plano.gratuito, v_plano.valor,
     true, current_date, nullif(trim(coalesce(p_observacao, '')), ''), v_uid)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.admin_contratar_assinatura(uuid, text) from public, anon;
grant execute on function public.admin_contratar_assinatura(uuid, text) to authenticated;
