-- =====================================================================
-- JH7 Gestão Fotográfica — REALTIME do módulo Leads
-- Rode no Supabase AUTOHOSPEDADO depois de 30_nota_tipo.sql.
-- Publica as tabelas que alimentam a lista de leads para que a tela
-- do painel Admin se atualize sozinha quando algo mudar no banco.
-- =====================================================================

alter table public.clientes replica identity full;
alter table public.cliente_notas replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.clientes;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.cliente_notas;
  exception when duplicate_object then null;
  end;
end $$;
