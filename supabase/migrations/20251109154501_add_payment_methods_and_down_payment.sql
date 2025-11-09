/*
  # Sistema de Entrada e Formas de Pagamento

  ## Mudanças

  ### 1. Nova Tabela: payment_methods
  Cadastro das formas de pagamento disponíveis:
  - `id` (uuid, primary key)
  - `name` (text) - Nome da forma de pagamento (Pix, Cartão Crédito, etc)
  - `icon` (text) - Ícone para exibição
  - `is_credit` (boolean) - Se é pagamento a crédito (gera parcelas)
  - `is_active` (boolean) - Se está ativo para uso
  - `created_at` (timestamp)

  ### 2. Modificações na Tabela: expenses
  Adicionar campos relacionados à entrada:
  - `down_payment_amount` (numeric) - Valor da entrada
  - `down_payment_method_id` (uuid) - Forma de pagamento da entrada
  - `down_payment_installments` (integer) - Parcelas da entrada (padrão 1)
  - `remaining_payment_method_id` (uuid) - Forma de pagamento do restante

  ### 3. Modificações na Tabela: installment_payments
  Adicionar campo para diferenciar parcelas:
  - `is_down_payment` (boolean) - Se a parcela é da entrada
  - `payment_method_id` (uuid) - Forma de pagamento da parcela

  ### 4. Dados Iniciais
  Popular tabela de formas de pagamento com opções padrão

  ### 5. Segurança
  - Habilitar RLS em payment_methods
  - Adicionar políticas de leitura para usuários autenticados
  - Atualizar função de criação de parcelas para suportar entrada

  ### 6. Importante
  - A entrada é opcional (pode ser 0 ou null)
  - Se houver entrada, ela será parcelada separadamente
  - O restante do valor será parcelado conforme definido
*/

-- ============================================
-- 1. CRIAR TABELA DE FORMAS DE PAGAMENTO
-- ============================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'circle-dollar-sign',
  is_credit boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. MODIFICAR TABELA EXPENSES
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'down_payment_amount'
  ) THEN
    ALTER TABLE expenses ADD COLUMN down_payment_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'down_payment_method_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN down_payment_method_id uuid REFERENCES payment_methods(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'down_payment_installments'
  ) THEN
    ALTER TABLE expenses ADD COLUMN down_payment_installments integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'remaining_payment_method_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN remaining_payment_method_id uuid REFERENCES payment_methods(id);
  END IF;
END $$;

-- ============================================
-- 3. MODIFICAR TABELA INSTALLMENT_PAYMENTS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installment_payments' AND column_name = 'is_down_payment'
  ) THEN
    ALTER TABLE installment_payments ADD COLUMN is_down_payment boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installment_payments' AND column_name = 'payment_method_id'
  ) THEN
    ALTER TABLE installment_payments ADD COLUMN payment_method_id uuid REFERENCES payment_methods(id);
  END IF;
END $$;

-- ============================================
-- 4. POPULAR FORMAS DE PAGAMENTO
-- ============================================

INSERT INTO payment_methods (name, icon, is_credit, is_active)
VALUES
  ('Pix', 'smartphone', false, true),
  ('Dinheiro', 'banknote', false, true),
  ('Cartão de Débito', 'credit-card', false, true),
  ('Cartão de Crédito', 'credit-card', true, true),
  ('Transferência Bancária', 'building-2', false, true),
  ('Boleto', 'file-text', false, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. SEGURANÇA - RLS
-- ============================================

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view payment methods" ON payment_methods;
CREATE POLICY "Everyone can view payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============================================
-- 6. ATUALIZAR FUNÇÃO DE CRIAÇÃO DE PARCELAS
-- ============================================

CREATE OR REPLACE FUNCTION create_installments_for_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  i integer;
  installment_amount numeric;
  due_date_var date;
  remaining_amount numeric;
  down_payment_per_installment numeric;
BEGIN
  due_date_var := NEW.start_date;
  
  -- Calcular valor que sobra após a entrada
  remaining_amount := NEW.total_amount - COALESCE(NEW.down_payment_amount, 0);
  
  -- Se houver entrada, criar parcelas da entrada
  IF NEW.down_payment_amount > 0 AND NEW.down_payment_installments > 0 THEN
    down_payment_per_installment := NEW.down_payment_amount / NEW.down_payment_installments;
    
    FOR i IN 1..NEW.down_payment_installments LOOP
      INSERT INTO installment_payments (
        expense_id, 
        installment_number, 
        amount, 
        due_date, 
        is_down_payment,
        payment_method_id
      )
      VALUES (
        NEW.id, 
        i, 
        down_payment_per_installment, 
        due_date_var,
        true,
        NEW.down_payment_method_id
      );
      
      due_date_var := due_date_var + INTERVAL '1 month';
    END LOOP;
  END IF;
  
  -- Criar parcelas do valor restante
  IF remaining_amount > 0 AND NEW.installments > 0 THEN
    installment_amount := remaining_amount / NEW.installments;
    
    -- Se já criamos parcelas de entrada, começar do próximo mês
    IF NEW.down_payment_amount > 0 THEN
      due_date_var := NEW.start_date + (NEW.down_payment_installments * INTERVAL '1 month');
    ELSE
      due_date_var := NEW.start_date;
    END IF;
    
    FOR i IN 1..NEW.installments LOOP
      INSERT INTO installment_payments (
        expense_id, 
        installment_number, 
        amount, 
        due_date,
        is_down_payment,
        payment_method_id
      )
      VALUES (
        NEW.id, 
        (COALESCE(NEW.down_payment_installments, 0) + i), 
        installment_amount, 
        due_date_var,
        false,
        NEW.remaining_payment_method_id
      );
      
      due_date_var := due_date_var + INTERVAL '1 month';
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 7. ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_installments_payment_method ON installment_payments(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_installments_is_down_payment ON installment_payments(is_down_payment);
CREATE INDEX IF NOT EXISTS idx_expenses_down_payment_method ON expenses(down_payment_method_id);
CREATE INDEX IF NOT EXISTS idx_expenses_remaining_payment_method ON expenses(remaining_payment_method_id);
