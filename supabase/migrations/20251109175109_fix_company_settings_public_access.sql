/*
  # Permitir Acesso Público às Configurações da Empresa
  
  ## Mudança
  
  A logo e nome da empresa precisam ser visíveis na página de login,
  onde o usuário ainda não está autenticado.
  
  ### Alterações de Segurança
  
  1. **Política de Leitura Pública**
     - Permite que qualquer pessoa (anon + authenticated) veja as configurações
     - Necessário para mostrar logo na tela de login
  
  2. **Política de Escrita Restrita**
     - Apenas usuários autenticados podem atualizar
     - Mantém a segurança dos dados
  
  ### Importante
  - Logo e nome da empresa são informações públicas
  - Não contém dados sensíveis
  - Melhora a experiência do usuário
*/

-- Remover política antiga que requer autenticação
DROP POLICY IF EXISTS "Everyone can view company settings" ON company_settings;

-- Criar nova política que permite acesso público (anon + authenticated)
CREATE POLICY "Public can view company settings"
  ON company_settings FOR SELECT
  USING (true);

-- Garantir que a política de UPDATE continua restrita
DROP POLICY IF EXISTS "Authenticated users can update company settings" ON company_settings;
CREATE POLICY "Authenticated users can update company settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
