-- =====================================================================
-- JH7 Gestão Fotográfica — ITENS DO ORÇAMENTO (cópia/snapshot)
-- Rode no Supabase AUTOHOSPEDADO depois de sql/44_orcamentos.sql.
--
-- Os serviços e agrupamentos são usados apenas como REFERÊNCIA na hora
-- de montar a proposta: os dados são COPIADOS para o orçamento.
-- Por isso NÃO existe relacionamento (foreign key) com servicos,
-- servico_grupos ou produtos. Se o cadastro mudar ou for excluído
-- depois, o orçamento continua exatamente como foi enviado ao cliente.
-- =====================================================================

create table if not exists public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  ordem integer not null default 0,
  -- De onde a cópia veio (só informativo): SERVICO ou GRUPO
  origem_tipo text not null default 'SERVICO',
  -- Nome do agrupamento de origem, quando o item veio de um grupo
  origem_nome text,
  nome text not null,
  quantidade numeric(12, 2) not null default 1,
  valor_unitario numeric(12, 2),
  valor_custo numeric(12, 2),
  -- Produtos que compunham o serviço no momento da cópia:
  -- [{ "nome": "Álbum 30x30", "quantidade": 1 }]
  produtos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.orcamento_itens
    add constraint orcamento_itens_origem_check
    check (origem_tipo in ('SERVICO', 'GRUPO', 'MANUAL'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.orcamento_itens
    add constraint orcamento_itens_nome_check
    check (char_length(btrim(nome)) between 1 and 200);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.orcamento_itens
    add constraint orcamento_itens_quantidade_check
    check (quantidade > 0);
exception when duplicate_object then null;
end $$;

create index if not exists orcamento_itens_orcamento_idx
  on public.orcamento_itens (orcamento_id, ordem);

create index if not exists orcamento_itens_empresa_idx
  on public.orcamento_itens (empresa_id);

-- updated_at automático (reaproveita a função criada em 38_servicos.sql)
drop trigger if exists orcamento_itens_updated_at on public.orcamento_itens;
create trigger orcamento_itens_updated_at
  before update on public.orcamento_itens
  for each row execute function public.servicos_set_updated_at();

-- Permissões da Data API ------------------------------------------------
grant select, insert, update, delete on public.orcamento_itens to authenticated;
grant all on public.orcamento_itens to service_role;

-- Segurança por linha ---------------------------------------------------
alter table public.orcamento_itens enable row level security;

drop policy if exists "itens do orçamento da própria empresa" on public.orcamento_itens;
create policy "itens do orçamento da própria empresa" on public.orcamento_itens
  for all to authenticated
  using (public.pode_acessar_empresa(empresa_id))
  with check (public.pode_acessar_empresa(empresa_id));

-- Tempo real ------------------------------------------------------------
alter table public.orcamento_itens replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.orcamento_itens;
exception when duplicate_object then null;
end $$;
