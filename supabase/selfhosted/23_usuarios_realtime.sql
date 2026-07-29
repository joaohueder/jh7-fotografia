-- =====================================================================
-- JH7 Gestão Fotográfica — REALTIME do módulo Usuários
-- Rode no Supabase AUTOHOSPEDADO depois de 22_logoff_imediato.sql.
-- Publica as tabelas que alimentam a lista de usuários para que a tela
-- do painel SA se atualize sozinha quando algo mudar no banco.
-- =====================================================================

alter table public.profiles replica identity full;
alter table public.user_roles replica identity full;
alter table public.sessoes_revogadas replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.user_roles;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.sessoes_revogadas;
  exception when duplicate_object then null;
  end;
end $$;
