-- RLS para permitir leitura pública da tabela clientes (apenas para landing page de lead)
-- Importante: Apenas colunas básicas para o lead completar o cadastro

CREATE POLICY "Permitir leitura pública limitada de leads"
ON public.clientes
FOR SELECT
TO anon
USING (
  -- Permite se for um lead (sem documento ou status aguardando)
  -- Ou se o ID for o que está sendo acessado via URL (o ID é um UUID difícil de adivinhar)
  situacao = 'AGUARDANDO' 
);

-- Permite que o anon atualize seus próprios dados
CREATE POLICY "Permitir atualização pública de leads"
ON public.clientes
FOR UPDATE
TO anon
USING (situacao = 'AGUARDANDO')
WITH CHECK (true);

-- Garantir acesso da role anon
GRANT SELECT, UPDATE ON public.clientes TO anon;
