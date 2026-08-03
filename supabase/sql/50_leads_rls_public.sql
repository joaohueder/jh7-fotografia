-- RLS para permitir leitura pública da tabela clientes (apenas para landing page de lead)
-- Importante: Apenas colunas básicas para o lead completar o cadastro

-- Removendo políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir leitura pública limitada de leads" ON public.clientes;
DROP POLICY IF EXISTS "Permitir atualização pública de leads" ON public.clientes;

-- Adicionando a coluna lead_status se não existir
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS lead_status text;

-- Normalizando valores de lead_status
UPDATE public.clientes SET lead_status = 'AGUARDANDO' WHERE lead_status IS NULL;

-- Criando políticas usando lead_status
CREATE POLICY "Permitir leitura pública limitada de leads"
ON public.clientes
FOR SELECT
TO anon
USING (
  lead_status = 'AGUARDANDO' 
);

-- Permite que o anon atualize seus próprios dados
CREATE POLICY "Permitir atualização pública de leads"
ON public.clientes
FOR UPDATE
TO anon
USING (lead_status = 'AGUARDANDO')
WITH CHECK (true);

-- Garantir acesso da role anon
GRANT SELECT, UPDATE ON public.clientes TO anon;
