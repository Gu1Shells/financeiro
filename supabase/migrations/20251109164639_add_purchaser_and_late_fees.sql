/*
  # Sistema de Responsável pela Compra e Juros por Atraso

  ## Mudanças

  ### 1. Modificações na Tabela: expenses
  Adicionar campos relacionados ao responsável pela compra:
  - `purchased_by` (uuid) - Quem realizou a compra/passou no cartão
  - `auto_pay_purchaser` (boolean) - Se deve quitar automaticamente as parcelas do comprador
  - `late_fee_percentage` (numeric) - Taxa de juros por dia de atraso (padrão 0.033% = taxa de maquininha)
  - `apply_late_fees` (boolean) - Se deve aplicar juros por atraso

  ### 2. Modificações na Tabela: installment_payments
  Adicionar campos para controle de edição e atraso:
  - `original_amount` (numeric) - Valor original da parcela (antes de edições)
  - `original_due_date` (date) - Data original de vencimento
  - `late_fee_amount` (numeric) - Valor de juros aplicado
  - `edited_at` (timestamp) - Data da última edição
  - `edited_by` (uuid) - Quem editou a parcela

  ### 3. Nova Tabela: installment_edit_history
  Histórico de todas as edições de parcelas:
  - `id` (uuid, primary key)
  - `installment_id` (uuid) - Parcela editada
  - `edited_by` (uuid) - Quem editou
  - `field_changed` (text) - Campo alterado (amount, due_date, etc)
  - `old_value` (text) - Valor antigo
  - `new_value` (text) - Valor novo
  - `reason` (text) - Motivo da edição
  - `edited_at` (timestamp)

  ### 4. Trigger para Pagamento Automático do Comprador
  Quando uma despesa é criada com `auto_pay_purchaser = true`,
  automaticamente cria contribuições para todas as parcelas do comprador

  ### 5. Função para Cálculo de Juros
  Função que calcula juros por dia de atraso baseado na taxa configurada

  ### 6. Segurança
  - Habilitar RLS em installment_edit_history
  - Adicionar políticas para edição de parcelas
  - Adicionar índices para performance

  ### 7. Importante
  - Taxa padrão de 0.033% ao dia (taxa típica de maquininha)
  - Histórico completo de todas as alterações
  - Comprador pode ter suas parcelas quitadas automaticamente
*/

-- ============================================
-- 1. MODIFICAR TABELA EXPENSES
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'purchased_by'
  ) THEN
    ALTER TABLE expenses ADD COLUMN purchased_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'auto_pay_purchaser'
  ) THEN
    ALTER TABLE expenses ADD COLUMN auto_pay_purchaser boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'late_fee_percentage'
  ) THEN
    ALTER TABLE expenses ADD COLUMN late_fee_percentage numeric DEFAULT 0.033;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'apply_late_fees'
  ) THEN
    ALTER TABLE expenses ADD COLUMN apply_late_fees boolean DEFAULT false;
  END IF;
END $$;

-- ============================================
-- 2. MODIFICAR TABELA INSTALLMENT_PAYMENTS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installment_payments' AND column_name = 'original_amount'
  ) THEN
    ALTER TABLE installment_payments ADD COLUMN original_amount numeric;
    UPDATE installment_payments SET original_amount = amount WHERE original_amount IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installment_payments' AND column_name = 'original_due_date'
  ) THEN
    ALTER TABLE installment_payments ADD COLUMN original_due_date date;
    UPDATE installment_payments SET original_due_date = due_date WHERE original_due_date IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installment_payments' AND column_name = 'late_fee_amount'
  ) THEN
    ALTER TABLE installment_payments ADD COLUMN late_fee_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installment_payments' AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE installment_payments ADD COLUMN edited_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installment_payments' AND column_name = 'edited_by'
  ) THEN
    ALTER TABLE installment_payments ADD COLUMN edited_by uuid REFERENCES profiles(id);
  END IF;
END $$;

-- ============================================
-- 3. CRIAR TABELA DE HISTÓRICO DE EDIÇÕES
-- ============================================

CREATE TABLE IF NOT EXISTS installment_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id uuid NOT NULL REFERENCES installment_payments(id) ON DELETE CASCADE,
  edited_by uuid NOT NULL REFERENCES profiles(id),
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  reason text,
  edited_at timestamptz DEFAULT now()
);

-- ============================================
-- 4. FUNÇÃO PARA PAGAMENTO AUTOMÁTICO DO COMPRADOR
-- ============================================

CREATE OR REPLACE FUNCTION auto_pay_purchaser_installments()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  installment_record record;
  installment_amount_value numeric;
BEGIN
  IF NEW.auto_pay_purchaser = true AND NEW.purchased_by IS NOT NULL THEN
    FOR installment_record IN 
      SELECT * FROM installment_payments 
      WHERE expense_id = NEW.id
    LOOP
      installment_amount_value := installment_record.amount;
      
      INSERT INTO payment_contributions (
        installment_id,
        user_id,
        amount,
        notes,
        paid_at
      ) VALUES (
        installment_record.id,
        NEW.purchased_by,
        installment_amount_value,
        'Pagamento automático - Responsável pela compra',
        NEW.start_date
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para pagamento automático (após criar parcelas)
DROP TRIGGER IF EXISTS trigger_auto_pay_purchaser ON expenses;
CREATE TRIGGER trigger_auto_pay_purchaser
  AFTER INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION auto_pay_purchaser_installments();

-- ============================================
-- 5. FUNÇÃO PARA CALCULAR JUROS POR ATRASO
-- ============================================

CREATE OR REPLACE FUNCTION calculate_late_fee(
  installment_id_param uuid
)
RETURNS numeric
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  installment_record record;
  expense_record record;
  days_late integer;
  late_fee numeric;
BEGIN
  SELECT * INTO installment_record
  FROM installment_payments
  WHERE id = installment_id_param;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  SELECT * INTO expense_record
  FROM expenses
  WHERE id = installment_record.expense_id;
  
  IF NOT FOUND OR expense_record.apply_late_fees = false THEN
    RETURN 0;
  END IF;
  
  days_late := GREATEST(0, CURRENT_DATE - installment_record.due_date);
  
  IF days_late > 0 THEN
    late_fee := installment_record.amount * (expense_record.late_fee_percentage / 100) * days_late;
    RETURN ROUND(late_fee, 2);
  END IF;
  
  RETURN 0;
END;
$$;

-- ============================================
-- 6. TRIGGER PARA REGISTRAR HISTÓRICO DE EDIÇÕES
-- ============================================

CREATE OR REPLACE FUNCTION log_installment_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.amount != NEW.amount THEN
    INSERT INTO installment_edit_history (
      installment_id,
      edited_by,
      field_changed,
      old_value,
      new_value,
      reason
    ) VALUES (
      NEW.id,
      NEW.edited_by,
      'amount',
      OLD.amount::text,
      NEW.amount::text,
      'Valor da parcela alterado'
    );
  END IF;
  
  IF OLD.due_date != NEW.due_date THEN
    INSERT INTO installment_edit_history (
      installment_id,
      edited_by,
      field_changed,
      old_value,
      new_value,
      reason
    ) VALUES (
      NEW.id,
      NEW.edited_by,
      'due_date',
      OLD.due_date::text,
      NEW.due_date::text,
      'Data de vencimento alterada'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_installment_edit ON installment_payments;
CREATE TRIGGER trigger_log_installment_edit
  AFTER UPDATE ON installment_payments
  FOR EACH ROW
  WHEN (OLD.amount IS DISTINCT FROM NEW.amount OR OLD.due_date IS DISTINCT FROM NEW.due_date)
  EXECUTE FUNCTION log_installment_edit();

-- ============================================
-- 7. SEGURANÇA - RLS
-- ============================================

ALTER TABLE installment_edit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view edit history" ON installment_edit_history;
CREATE POLICY "Users can view edit history"
  ON installment_edit_history FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create edit history" ON installment_edit_history;
CREATE POLICY "Users can create edit history"
  ON installment_edit_history FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = edited_by);

-- Política para permitir edição de parcelas
DROP POLICY IF EXISTS "Users can update installments" ON installment_payments;
CREATE POLICY "Users can update installments"
  ON installment_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = installment_payments.expense_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = installment_payments.expense_id
    )
  );

-- ============================================
-- 8. ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_expenses_purchased_by ON expenses(purchased_by);
CREATE INDEX IF NOT EXISTS idx_installments_edited_by ON installment_payments(edited_by);
CREATE INDEX IF NOT EXISTS idx_edit_history_installment ON installment_edit_history(installment_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_edited_by ON installment_edit_history(edited_by);

-- ============================================
-- 9. ATUALIZAR FUNÇÃO DE CRIAÇÃO DE PARCELAS
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
  
  remaining_amount := NEW.total_amount - COALESCE(NEW.down_payment_amount, 0);
  
  IF NEW.down_payment_amount > 0 AND NEW.down_payment_installments > 0 THEN
    down_payment_per_installment := NEW.down_payment_amount / NEW.down_payment_installments;
    
    FOR i IN 1..NEW.down_payment_installments LOOP
      INSERT INTO installment_payments (
        expense_id, 
        installment_number, 
        amount, 
        due_date, 
        is_down_payment,
        payment_method_id,
        original_amount,
        original_due_date
      )
      VALUES (
        NEW.id, 
        i, 
        down_payment_per_installment, 
        due_date_var,
        true,
        NEW.down_payment_method_id,
        down_payment_per_installment,
        due_date_var
      );
      
      due_date_var := due_date_var + INTERVAL '1 month';
    END LOOP;
  END IF;
  
  IF remaining_amount > 0 AND NEW.installments > 0 THEN
    installment_amount := remaining_amount / NEW.installments;
    
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
        payment_method_id,
        original_amount,
        original_due_date
      )
      VALUES (
        NEW.id, 
        (COALESCE(NEW.down_payment_installments, 0) + i), 
        installment_amount, 
        due_date_var,
        false,
        NEW.remaining_payment_method_id,
        installment_amount,
        due_date_var
      );
      
      due_date_var := due_date_var + INTERVAL '1 month';
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;