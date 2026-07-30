-- =====================================================================
-- JH7 Gestão Fotográfica — CORREÇÃO DAS PERMISSÕES DE PRODUTOS
-- Rode no Supabase AUTOHOSPEDADO se você já executou o 36_produtos.sql.
--
-- Problema corrigido:
--   As políticas antigas usavam minha_empresa_id(null), que dispara o erro
--   "Usuário não está vinculado a uma empresa" quando o SA admin acessa o
--   painel de uma empresa (o SA não tem empresa no perfil).
--
-- Agora usamos pode_acessar_empresa(), que libera:
--   * o usuário/admin da própria empresa;
--   * o SA admin (inclusive ao acessar o painel de uma empresa).
-- =====================================================================

drop policy if exists "produtos_select_empresa" on public.produtos;
drop policy if exists "produtos_insert_empresa" on public.produtos;
drop policy if exists "produtos_update_empresa" on public.produtos;
drop policy if exists "produtos_delete_empresa" on public.produtos;

drop policy if exists "produtos da própria empresa" on public.produtos;
create policy "produtos da própria empresa" on public.produtos
  for all to authenticated
  using (public.pode_acessar_empresa(empresa_id))
  with check (public.pode_acessar_empresa(empresa_id));
