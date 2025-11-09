/*
  # Sistema Financeiro Compartilhado - Schema Completo

  ## Visão Geral
  Sistema para gestão financeira compartilhada entre 3 sócios com controle de:
  - Despesas parceladas e à vista
  - Despesas fixas mensais
  - Contribuições individuais para cada pagamento
  - Histórico completo de transações
  - Relatórios e analytics

  ## 1. Tabelas Principais

  ### profiles
  Perfil estendido dos usuários (complementa auth.users)
  - `id` (uuid, FK para auth.users)
  - `full_name` (text) - Nome completo
  - `avatar_url` (text, opcional) - URL do avatar
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

  ### expense_categories
  Categorias de despesas
  - `id` (uuid, PK)
  - `name` (text) - Nome da categoria
  - `icon` (text) - Ícone da categoria
  - `color` (text) - Cor para visualização
  - `created_at` (timestamp)

  ### expenses
  Despesas registradas (parceladas ou à vista)
  - `id` (uuid, PK)
  - `title` (text) - Título/descrição
  - `total_amount` (numeric) - Valor total
  - `category_id` (uuid, FK)
  - `created_by` (uuid, FK para profiles)
  - `installments` (integer) - Número de parcelas
  - `is_fixed` (boolean) - Se é despesa fixa mensal
  - `start_date` (date) - Data de início
  - `notes` (text, opcional)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

  ### installment_payments
  Parcelas individuais de cada despesa
  - `id` (uuid, PK)
  - `expense_id` (uuid, FK)
  - `installment_number` (integer) - Número da parcela
  - `amount` (numeric) - Valor da parcela
  - `due_date` (date) - Data de vencimento
  - `status` (text) - pending, partial, paid
  - `created_at` (timestamp)

  ### payment_contributions
  Contribuições individuais para cada parcela
  - `id` (uuid, PK)
  - `installment_id` (uuid, FK)
  - `user_id` (uuid, FK para profiles)
  - `amount` (numeric) - Valor pago
  - `paid_at` (timestamp) - Data do pagamento
  - `notes` (text, opcional)
  - `created_at` (timestamp)

  ## 2. Segurança (RLS)
  - Todas as tabelas têm RLS habilitado
  - Usuários autenticados podem ver todos os dados (sistema compartilhado)
  - Apenas o criador pode deletar suas próprias despesas
  - Qualquer usuário pode adicionar contribuições

  ## 3. Índices
  - Índices em foreign keys para performance
  - Índices em campos de data para queries de relatórios
  - Índices em status para filtros rápidos
*/

-- Criar tabela de perfis
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Criar tabela de categorias
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'tag',
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create categories"
  ON expense_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Inserir categorias padrão
INSERT INTO expense_categories (name, icon, color) VALUES
  ('Aluguel', 'home', '#ef4444'),
  ('Contas de Água', 'droplet', '#3b82f6'),
  ('Contas de Luz', 'zap', '#f59e0b'),
  ('Eletrodomésticos', 'tv', '#8b5cf6'),
  ('Móveis', 'armchair', '#ec4899'),
  ('Alimentação', 'utensils', '#10b981'),
  ('Internet', 'wifi', '#06b6d4'),
  ('Manutenção', 'wrench', '#6366f1'),
  ('Outros', 'tag', '#64748b')
ON CONFLICT DO NOTHING;

-- Criar tabela de despesas
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  total_amount numeric(10, 2) NOT NULL CHECK (total_amount > 0),
  category_id uuid REFERENCES expense_categories(id),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  installments integer NOT NULL DEFAULT 1 CHECK (installments > 0),
  is_fixed boolean DEFAULT false,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Criar índices para expenses
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_start_date ON expenses(start_date);
CREATE INDEX IF NOT EXISTS idx_expenses_is_fixed ON expenses(is_fixed);

-- Criar tabela de parcelas
CREATE TABLE IF NOT EXISTS installment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid REFERENCES expenses(id) ON DELETE CASCADE NOT NULL,
  installment_number integer NOT NULL CHECK (installment_number > 0),
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(expense_id, installment_number)
);

ALTER TABLE installment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all installments"
  ON installment_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create installments"
  ON installment_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update installments"
  ON installment_payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Criar índices para installment_payments
CREATE INDEX IF NOT EXISTS idx_installments_expense ON installment_payments(expense_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installment_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installment_payments(status);

-- Criar tabela de contribuições
CREATE TABLE IF NOT EXISTS payment_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id uuid REFERENCES installment_payments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  paid_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all contributions"
  ON payment_contributions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create contributions"
  ON payment_contributions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own contributions"
  ON payment_contributions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contributions"
  ON payment_contributions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Criar índices para payment_contributions
CREATE INDEX IF NOT EXISTS idx_contributions_installment ON payment_contributions(installment_id);
CREATE INDEX IF NOT EXISTS idx_contributions_user ON payment_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_paid_at ON payment_contributions(paid_at);

-- Função para atualizar status da parcela
CREATE OR REPLACE FUNCTION update_installment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid numeric;
  installment_amount numeric;
BEGIN
  SELECT amount INTO installment_amount
  FROM installment_payments
  WHERE id = NEW.installment_id;

  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM payment_contributions
  WHERE installment_id = NEW.installment_id;

  IF total_paid >= installment_amount THEN
    UPDATE installment_payments
    SET status = 'paid'
    WHERE id = NEW.installment_id;
  ELSIF total_paid > 0 THEN
    UPDATE installment_payments
    SET status = 'partial'
    WHERE id = NEW.installment_id;
  ELSE
    UPDATE installment_payments
    SET status = 'pending'
    WHERE id = NEW.installment_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar status automaticamente
DROP TRIGGER IF EXISTS trigger_update_installment_status ON payment_contributions;
CREATE TRIGGER trigger_update_installment_status
AFTER INSERT OR UPDATE OR DELETE ON payment_contributions
FOR EACH ROW
EXECUTE FUNCTION update_installment_status();

-- Função para criar parcelas automaticamente
CREATE OR REPLACE FUNCTION create_installments_for_expense()
RETURNS TRIGGER AS $$
DECLARE
  i integer;
  installment_amount numeric;
  due_date_var date;
BEGIN
  installment_amount := NEW.total_amount / NEW.installments;
  due_date_var := NEW.start_date;

  FOR i IN 1..NEW.installments LOOP
    INSERT INTO installment_payments (expense_id, installment_number, amount, due_date)
    VALUES (NEW.id, i, installment_amount, due_date_var);
    
    due_date_var := due_date_var + INTERVAL '1 month';
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar parcelas automaticamente
DROP TRIGGER IF EXISTS trigger_create_installments ON expenses;
CREATE TRIGGER trigger_create_installments
AFTER INSERT ON expenses
FOR EACH ROW
EXECUTE FUNCTION create_installments_for_expense();