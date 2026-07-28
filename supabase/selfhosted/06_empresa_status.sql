-- =====================================================================
-- PATCH: Ativar/Inativar empresa com nota obrigatória + histórico
-- Rode no SQL Editor do seu Supabase autohospedado.
-- =====================================================================

create table if not exists public.empresa_status_historico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  status_anterior text,
  status_novo text not null,
  nota text not null,
  alterado_por uuid,
  created_at timestamptz not null default now()
);

create index if not exists empresa_status_historico_empresa_idx
  on public.empresa_status_historico (empresa_id, created_at desc);

grant select on public.empresa_status_historico to authenticated;

alter table public.empresa_status_historico enable row level security;

drop policy if exists "sa_admin le historico" on public.empresa_status_historico;
create policy "sa_admin le historico"
  on public.empresa_status_historico
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'sa_admin'));

-- Alterna o status da empresa exigindo uma nota justificando a mudança.
create or replace function public.sa_set_empresa_status(
  p_id uuid,
  p_status text,
  p_nota text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_atual text;
begin
  if not public.has_role(auth.uid(), 'sa_admin') then
    raise exception 'Acesso negado';
  end if;

  if p_status not in ('ATIVO', 'INATIVO') then
    raise exception 'Status inválido';
  end if;

  if p_nota is null or length(trim(p_nota)) < 5 then
    raise exception 'Informe uma nota com pelo menos 5 caracteres';
  end if;

  select status::text into v_atual from public.empresas where id = p_id;
  if not found then
    raise exception 'Empresa não encontrada';
  end if;

  update public.empresas set status = p_status::public.empresa_status where id = p_id;

  insert into public.empresa_status_historico
    (empresa_id, status_anterior, status_novo, nota, alterado_por)
  values (p_id, v_atual, p_status, trim(p_nota), auth.uid());
end$$;

revoke all on function public.sa_set_empresa_status(uuid, text, text) from public, anon;
grant execute on function public.sa_set_empresa_status(uuid, text, text) to authenticated;
