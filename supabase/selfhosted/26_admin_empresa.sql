-- =====================================================================
-- 26 — Dados da empresa no painel do administrador da empresa
-- Permite que o admin da própria empresa consulte e atualize o cadastro.
-- O SA admin continua usando as RPCs sa_* (pode passar p_id).
-- Campos sensíveis de controle do SaaS (status, cnpj) NÃO são alterados aqui.
-- =====================================================================

-- Resolve a empresa que o usuário logado pode administrar.
create or replace function public.minha_empresa_id(p_id uuid default null)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_empresa uuid;
begin
  if auth.uid() is null then
    raise exception 'Acesso negado';
  end if;

  -- SA admin pode consultar qualquer empresa informando o id.
  if public.has_role(auth.uid(), 'sa_admin') and p_id is not null then
    return p_id;
  end if;

  select empresa_id into v_empresa from public.profiles where id = auth.uid();

  if v_empresa is null then
    raise exception 'Usuário não está vinculado a uma empresa';
  end if;

  return v_empresa;
end$$;

revoke all on function public.minha_empresa_id(uuid) from public, anon;
grant execute on function public.minha_empresa_id(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: dados completos da empresa do usuário logado
-- ---------------------------------------------------------------------
create or replace function public.minha_empresa(p_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_empresa uuid := public.minha_empresa_id(p_id);
  v_row jsonb;
  v_contatos jsonb;
begin
  select to_jsonb(e) into v_row from public.empresas e where e.id = v_empresa;
  if v_row is null then
    raise exception 'Empresa não encontrada';
  end if;

  select coalesce(
           jsonb_agg(jsonb_build_object('tipo', c.tipo, 'valor', c.valor, 'descricao', c.descricao)
                     order by c.created_at),
           '[]'::jsonb)
    into v_contatos
  from public.empresa_contatos c
  where c.empresa_id = v_empresa;

  return jsonb_build_object('empresa', v_row, 'contatos', v_contatos);
end$$;

revoke all on function public.minha_empresa(uuid) from public, anon;
grant execute on function public.minha_empresa(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: atualizar dados cadastrais da própria empresa (admin da empresa)
-- ---------------------------------------------------------------------
create or replace function public.admin_update_empresa(
  p_empresa jsonb,
  p_contatos jsonb default '[]'::jsonb,
  p_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa uuid := public.minha_empresa_id(p_id);
begin
  -- Somente o administrador da empresa (ou o SA admin) pode alterar o cadastro.
  if not (public.has_role(auth.uid(), 'sa_admin') or public.has_role(auth.uid(), 'admin')) then
    raise exception 'Acesso negado';
  end if;

  update public.empresas e set
    razao_social = n.razao_social,
    nome_fantasia = n.nome_fantasia,
    cep = n.cep, endereco = n.endereco, complemento = n.complemento, numero = n.numero,
    bairro = n.bairro, cidade = n.cidade, uf = n.uf,
    resp_nome = n.resp_nome, resp_nascimento = n.resp_nascimento, resp_cpf = n.resp_cpf,
    resp_cep = n.resp_cep, resp_endereco = n.resp_endereco, resp_complemento = n.resp_complemento,
    resp_numero = n.resp_numero, resp_bairro = n.resp_bairro, resp_cidade = n.resp_cidade,
    resp_uf = n.resp_uf, resp_whatsapp = n.resp_whatsapp, resp_email = n.resp_email,
    contato_whatsapp = n.contato_whatsapp, contato_email = n.contato_email,
    observacoes = n.observacoes
  from jsonb_to_record(p_empresa) as n(
    razao_social text, nome_fantasia text,
    cep text, endereco text, complemento text, numero text, bairro text, cidade text, uf text,
    resp_nome text, resp_nascimento date, resp_cpf text, resp_cep text, resp_endereco text,
    resp_complemento text, resp_numero text, resp_bairro text, resp_cidade text, resp_uf text,
    resp_whatsapp text, resp_email text, contato_whatsapp text, contato_email text,
    observacoes text
  )
  where e.id = v_empresa;

  if not found then
    raise exception 'Empresa não encontrada';
  end if;

  delete from public.empresa_contatos where empresa_id = v_empresa;

  insert into public.empresa_contatos (empresa_id, tipo, valor, descricao)
  select v_empresa, c.tipo, c.valor, nullif(c.descricao, '')
  from jsonb_to_recordset(coalesce(p_contatos, '[]'::jsonb))
       as c(tipo text, valor text, descricao text)
  where coalesce(c.valor, '') <> '';

  return v_empresa;
end$$;

revoke all on function public.admin_update_empresa(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.admin_update_empresa(jsonb, jsonb, uuid) to authenticated;
