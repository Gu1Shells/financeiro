/*
  # Correções de Segurança e Performance

  ## Mudanças

  ### 1. Índices Ausentes (Performance)
  - Adicionar índice para `expenses.deleted_by` (foreign key sem índice)

  ### 2. Otimização RLS (Performance)
  Otimizar políticas RLS para evitar re-avaliação de `auth.uid()` em cada linha.
  Substituir `auth.uid()` por `(select auth.uid())` nas seguintes políticas:
  
  #### Tabela profiles:
  - `Users can update own profile`
  - `Users can insert own profile`
  
  #### Tabela expenses:
  - `Users can create expenses`
  - `Users can update own expenses`
  - `Users can delete own expenses`
  
  #### Tabela payment_contributions:
  - `Users can update own contributions`
  - `Users can delete own contributions`
  
  #### Tabela expense_deletion_logs:
  - `Users can create deletion logs`

  ### 3. Índices Não Utilizados
  Remover índices que não estão sendo utilizados para reduzir overhead:
  - `idx_contributions_paid_at`
  - `idx_expenses_is_fixed`
  - `idx_installments_due_date`
  - `idx_installments_status`
  - `idx_expenses_deleted_at`
  - `idx_deletion_logs_deleted_by`
  - `idx_expenses_created_by`
  - `idx_expenses_category`
  - `idx_expenses_start_date`

  ### 4. Funções com Search Path Mutável (Segurança)
  Adicionar `SET search_path = public` às funções para prevenir vulnerabilidades:
  - `soft_delete_expense`
  - `update_installment_status`
  - `create_installments_for_expense`

  ### 5. Importante
  - Proteção de senha vazada deve ser habilitada manualmente no painel do Supabase
  - Os índices removidos podem ser recriados no futuro se necessário
*/

-- ============================================
-- 1. ADICIONAR ÍNDICE AUSENTE
-- ============================================

-- Índice para foreign key expenses.deleted_by
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_by ON expenses(deleted_by) WHERE deleted_by IS NOT NULL;

-- ============================================
-- 2. REMOVER ÍNDICES NÃO UTILIZADOS
-- ============================================

DROP INDEX IF EXISTS idx_contributions_paid_at;
DROP INDEX IF EXISTS idx_expenses_is_fixed;
DROP INDEX IF EXISTS idx_installments_due_date;
DROP INDEX IF EXISTS idx_installments_status;
DROP INDEX IF EXISTS idx_expenses_deleted_at;
DROP INDEX IF EXISTS idx_deletion_logs_deleted_by;
DROP INDEX IF EXISTS idx_expenses_created_by;
DROP INDEX IF EXISTS idx_expenses_category;
DROP INDEX IF EXISTS idx_expenses_start_date;

-- ============================================
-- 3. OTIMIZAR POLÍTICAS RLS - PROFILES
-- ============================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- ============================================
-- 4. OTIMIZAR POLÍTICAS RLS - EXPENSES
-- ============================================

DROP POLICY IF EXISTS "Users can create expenses" ON expenses;
CREATE POLICY "Users can create expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;
CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = created_by);

-- ============================================
-- 5. OTIMIZAR POLÍTICAS RLS - PAYMENT_CONTRIBUTIONS
-- ============================================

DROP POLICY IF EXISTS "Users can update own contributions" ON payment_contributions;
CREATE POLICY "Users can update own contributions"
  ON payment_contributions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own contributions" ON payment_contributions;
CREATE POLICY "Users can delete own contributions"
  ON payment_contributions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================
-- 6. OTIMIZAR POLÍTICAS RLS - EXPENSE_DELETION_LOGS
-- ============================================

DROP POLICY IF EXISTS "Users can create deletion logs" ON expense_deletion_logs;
CREATE POLICY "Users can create deletion logs"
  ON expense_deletion_logs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = deleted_by);

-- ============================================
-- 7. CORRIGIR SEARCH PATH DAS FUNÇÕES
-- ============================================

-- Recriar função soft_delete_expense com search_path seguro
CREATE OR REPLACE FUNCTION soft_delete_expense(
  expense_id_param uuid,
  user_id_param uuid,
  reason_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expense_record record;
BEGIN
  SELECT * INTO expense_record
  FROM expenses
  WHERE id = expense_id_param AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Despesa não encontrada ou já foi excluída';
  END IF;

  INSERT INTO expense_deletion_logs (
    expense_id,
    expense_title,
    expense_amount,
    deleted_by,
    deletion_reason,
    expense_data
  ) VALUES (
    expense_record.id,
    expense_record.title,
    expense_record.total_amount,
    user_id_param,
    reason_param,
    to_jsonb(expense_record)
  );

  UPDATE expenses
  SET deleted_at = now(),
      deleted_by = user_id_param
  WHERE id = expense_id_param;
END;
$$;

-- Recriar função update_installment_status com search_path seguro
CREATE OR REPLACE FUNCTION update_installment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  total_paid numeric;
  installment_amount numeric;
BEGIN
  SELECT amount INTO installment_amount
  FROM installment_payments
  WHERE id = COALESCE(NEW.installment_id, OLD.installment_id);

  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM payment_contributions
  WHERE installment_id = COALESCE(NEW.installment_id, OLD.installment_id);

  IF total_paid >= installment_amount THEN
    UPDATE installment_payments
    SET status = 'paid'
    WHERE id = COALESCE(NEW.installment_id, OLD.installment_id);
  ELSIF total_paid > 0 THEN
    UPDATE installment_payments
    SET status = 'partial'
    WHERE id = COALESCE(NEW.installment_id, OLD.installment_id);
  ELSE
    UPDATE installment_payments
    SET status = 'pending'
    WHERE id = COALESCE(NEW.installment_id, OLD.installment_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recriar função create_installments_for_expense com search_path seguro
CREATE OR REPLACE FUNCTION create_installments_for_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;
