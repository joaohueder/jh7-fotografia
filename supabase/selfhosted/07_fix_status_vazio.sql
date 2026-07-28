-- =====================================================================
-- PATCH: corrige "invalid input value for enum empresa_status: \"\""
-- ao salvar/alterar senha de uma empresa.
-- O status agora é lido como texto e valores vazios mantêm o status atual.
-- Rode no SQL Editor do seu Supabase autohospedado.
-- =====================================================================

create or replace function public.sa_update_empresa(
  p_id uuid,
  p_empresa jsonb,
  p_contatos jsonb default '[]'::jsonb,
  p_password text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_admin uuid;
begin
  if not public.has_role(auth.uid(), 'sa_admin') then
    raise exception 'Acesso negado';
  end if;

  update public.empresas e set
    razao_social = n.razao_social,
    nome_fantasia = n.nome_fantasia,
    cnpj = n.cnpj,
    status = coalesce(
      nullif(trim(coalesce(n.status, '')), '')::public.empresa_status,
      e.status,
      'ATIVO'
    ),
    cep = n.cep, endereco = n.endereco, complemento = n.complemento, numero = n.numero,
    bairro = n.bairro, cidade = n.cidade, uf = n.uf,
    resp_nome = n.resp_nome, resp_nascimento = n.resp_nascimento, resp_cpf = n.resp_cpf,
    resp_cep = n.resp_cep, resp_endereco = n.resp_endereco, resp_complemento = n.resp_complemento,
    resp_numero = n.resp_numero, resp_bairro = n.resp_bairro, resp_cidade = n.resp_cidade,
    resp_uf = n.resp_uf, resp_whatsapp = n.resp_whatsapp, resp_email = n.resp_email,
    contato_whatsapp = n.contato_whatsapp, contato_email = n.contato_email,
    observacoes = n.observacoes
  from jsonb_to_record(p_empresa) as n(
    razao_social text, nome_fantasia text, cnpj text, status text,
    cep text, endereco text, complemento text, numero text, bairro text, cidade text, uf text,
    resp_nome text, resp_nascimento date, resp_cpf text, resp_cep text, resp_endereco text,
    resp_complemento text, resp_numero text, resp_bairro text, resp_cidade text, resp_uf text,
    resp_whatsapp text, resp_email text, contato_whatsapp text, contato_email text,
    observacoes text
  )
  where e.id = p_id
  returning e.admin_user_id into v_admin;

  if not found then
    raise exception 'Empresa não encontrada';
  end if;

  delete from public.empresa_contatos where empresa_id = p_id;
  insert into public.empresa_contatos (empresa_id, tipo, valor, descricao)
  select p_id, c.tipo, c.valor, c.descricao
  from jsonb_to_recordset(coalesce(p_contatos, '[]'::jsonb))
    as c(tipo text, valor text, descricao text)
  where coalesce(trim(c.valor), '') <> '';

  if p_password is not null and length(p_password) > 0 and v_admin is not null then
    if length(p_password) < 8 then
      raise exception 'A senha deve ter pelo menos 8 caracteres';
    end if;
    update auth.users
       set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
           updated_at = now()
     where id = v_admin;
  end if;

  return p_id;
end$$;

revoke all on function public.sa_update_empresa(uuid, jsonb, jsonb, text) from public, anon;
grant execute on function public.sa_update_empresa(uuid, jsonb, jsonb, text) to authenticated;

-- Mesma proteção na criação de empresa.
create or replace function public.sa_empresa_status_safe(p_status text)
returns public.empresa_status
language sql
immutable
as $$
  select coalesce(nullif(trim(coalesce(p_status, '')), '')::public.empresa_status, 'ATIVO')
$$;

grant execute on function public.sa_empresa_status_safe(text) to authenticated;
