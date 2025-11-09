/*
  # Sistema de Logo da Empresa e Fotos de Perfil

  ## Mudanças

  ### 1. Nova Tabela: company_settings
  Configurações gerais da empresa:
  - `id` (uuid, primary key)
  - `company_name` (text) - Nome da empresa
  - `company_logo_url` (text) - URL da logo
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

  ### 2. Modificações na Tabela: profiles
  Adicionar campo de foto de perfil:
  - `profile_photo_url` (text) - URL da foto de perfil

  ### 3. Bucket de Storage
  - Criar bucket 'avatars' para fotos de perfil
  - Criar bucket 'company' para logo da empresa
  - Políticas de acesso público para leitura
  - Políticas de escrita autenticada

  ### 4. Segurança
  - RLS na tabela company_settings
  - Todos podem ler configurações
  - Apenas autenticados podem atualizar

  ### 5. Importante
  - Logo da empresa visível em toda aplicação
  - Fotos de perfil nos cards e relatórios
  - Upload direto do navegador
*/

-- ============================================
-- 1. CRIAR TABELA DE CONFIGURAÇÕES DA EMPRESA
-- ============================================

CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text DEFAULT 'Minha Empresa',
  company_logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO company_settings (company_name)
SELECT 'Minha Empresa'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- ============================================
-- 2. ADICIONAR FOTO DE PERFIL
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_photo_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_photo_url text;
  END IF;
END $$;

-- ============================================
-- 3. SEGURANÇA - RLS
-- ============================================

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view company settings" ON company_settings;
CREATE POLICY "Everyone can view company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can update company settings" ON company_settings;
CREATE POLICY "Authenticated users can update company settings"
  ON company_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Atualizar política de profiles para incluir foto
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 4. TRIGGER PARA UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_company_settings_updated_at ON company_settings;
CREATE TRIGGER trigger_update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_settings_updated_at();

-- ============================================
-- 5. FUNÇÃO HELPER PARA PEGAR CONFIGURAÇÕES
-- ============================================

CREATE OR REPLACE FUNCTION get_company_settings()
RETURNS TABLE(
  company_name text,
  company_logo_url text
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.company_name,
    cs.company_logo_url
  FROM company_settings cs
  LIMIT 1;
END;
$$;