-- =====================================================================
-- JH7 Gestão Fotográfica — REALTIME GERAL (todo o sistema)
-- Rode no Supabase AUTOHOSPEDADO depois de sql/34_planos_limites.sql.
--
-- O que este script faz:
--   • Marca as tabelas com "replica identity full" (para que o banco envie
--     também os dados antigos em updates/deletes).
--   • Publica todas as tabelas do sistema na publicação supabase_realtime,
--     ignorando as que já estavam publicadas.
--
-- Depois de rodar, todas as telas (empresas, planos, assinaturas, limites,
-- clientes, leads, notas, usuários e perfil) se atualizam sozinhas.
-- =====================================================================

do $$
declare
  t text;
  tabelas text[] := array[
    'profiles',
    'user_roles',
    'sessoes_revogadas',
    'empresas',
    'empresa_contatos',
    'empresa_assinaturas',
    'planos',
    'clientes',
    'cliente_contatos',
    'cliente_notas',
    'usuario_preferencias',
    'sistema_config'
  ];
begin
  foreach t in array tabelas loop
    -- Ignora tabelas que ainda não existem neste banco.
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;

    execute format('alter table public.%I replica identity full', t);

    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when others then null;
    end;
  end loop;
end $$;
