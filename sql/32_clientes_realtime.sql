-- =====================================================================
-- JH7 Gestão Fotográfica — REALTIME do módulo Clientes
-- Rode no Supabase AUTOHOSPEDADO depois de 31_leads_realtime.sql.
-- A tabela public.clientes já foi publicada no script 31; aqui apenas
-- adicionamos os contatos do cliente, para que a tela de Clientes do
-- painel Admin se atualize sozinha em qualquer alteração.
-- =====================================================================

alter table public.cliente_contatos replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.clientes;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.cliente_contatos;
  exception when duplicate_object then null;
  end;
end $$;
