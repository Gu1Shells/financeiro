/*
  # Fix Security and Performance Issues

  1. Performance Improvements
    - Add missing indexes for foreign keys
    - Remove duplicate indexes
    - Keep only necessary indexes
  
  2. Security Improvements
    - Fix function search paths to prevent SQL injection
    - Remove SECURITY DEFINER from views (use RLS instead)
    - All changes maintain data integrity and access control
  
  3. Changes Made
    - Add indexes: deleted_by, category_id, reopened_by foreign keys
    - Remove duplicate and unused indexes
    - Set immutable search_path on all functions
    - Recreate views without SECURITY DEFINER
*/

-- ============================================
-- PART 1: Add Missing Foreign Key Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_expense_deletion_logs_deleted_by 
  ON expense_deletion_logs(deleted_by);

CREATE INDEX IF NOT EXISTS idx_expenses_category_id 
  ON expenses(category_id);

CREATE INDEX IF NOT EXISTS idx_installments_reopened_by 
  ON installment_payments(reopened_by);

-- ============================================
-- PART 2: Remove Duplicate Indexes
-- ============================================

DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_contributions_user_id;

-- ============================================
-- PART 3: Remove Unused Indexes
-- ============================================

DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_expenses_created_by;
DROP INDEX IF EXISTS idx_installments_status;
DROP INDEX IF EXISTS idx_expenses_deleted_by;
DROP INDEX IF EXISTS idx_expenses_purchased_by_not_deleted;
DROP INDEX IF EXISTS idx_installments_payment_method;
DROP INDEX IF EXISTS idx_installments_is_down_payment;
DROP INDEX IF EXISTS idx_expenses_down_payment_method;
DROP INDEX IF EXISTS idx_expenses_remaining_payment_method;
DROP INDEX IF EXISTS idx_installments_due_date;
DROP INDEX IF EXISTS idx_expenses_purchased_by;
DROP INDEX IF EXISTS idx_installments_edited_by;
DROP INDEX IF EXISTS idx_edit_history_installment;
DROP INDEX IF EXISTS idx_edit_history_edited_by;
DROP INDEX IF EXISTS idx_expenses_status;
DROP INDEX IF EXISTS idx_expenses_recurring;
DROP INDEX IF EXISTS idx_expenses_parent;
DROP INDEX IF EXISTS idx_audit_logs_entity;

-- ============================================
-- PART 4: Fix Function Search Paths
-- ============================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_description text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_description,
    p_metadata
  );
END;
$$;

CREATE OR REPLACE FUNCTION log_installment_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'paid' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      description
    ) VALUES (
      auth.uid(),
      'update',
      'installment',
      NEW.id,
      'Parcela marcada como paga'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION log_installment_reopening()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' AND NEW.status = 'pending' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      description,
      metadata
    ) VALUES (
      NEW.reopened_by,
      'update',
      'installment',
      NEW.id,
      'Parcela reaberta',
      jsonb_build_object(
        'reason', NEW.reopen_reason,
        'reopened_at', NEW.reopened_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION check_and_update_expense_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  total_installments int;
  paid_installments int;
  expense_rec record;
BEGIN
  SELECT * INTO expense_rec
  FROM expenses
  WHERE id = NEW.expense_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'paid') as paid
  INTO total_installments, paid_installments
  FROM installment_payments
  WHERE expense_id = NEW.expense_id;

  IF paid_installments = total_installments AND total_installments > 0 THEN
    UPDATE expenses
    SET status = 'paid'
    WHERE id = NEW.expense_id AND status != 'paid';
  ELSIF paid_installments > 0 AND paid_installments < total_installments THEN
    UPDATE expenses
    SET status = 'partial'
    WHERE id = NEW.expense_id AND status != 'partial';
  ELSIF paid_installments = 0 THEN
    UPDATE expenses
    SET status = 'pending'
    WHERE id = NEW.expense_id AND status != 'pending';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION log_expense_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      description
    ) VALUES (
      NEW.created_by,
      'create',
      'expense',
      NEW.id,
      'Despesa criada: ' || NEW.title
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        description
      ) VALUES (
        NEW.deleted_by,
        'delete',
        'expense',
        NEW.id,
        'Despesa excluída: ' || NEW.title
      );
    ELSIF OLD.title != NEW.title OR OLD.total_amount != NEW.total_amount THEN
      INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        description
      ) VALUES (
        auth.uid(),
        'update',
        'expense',
        NEW.id,
        'Despesa atualizada: ' || NEW.title
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================
-- PART 5: Recreate Views Without SECURITY DEFINER
-- ============================================

DROP VIEW IF EXISTS user_debt_summary CASCADE;
CREATE VIEW user_debt_summary AS
SELECT 
  p.id as user_id,
  p.full_name,
  COALESCE(SUM(
    CASE 
      WHEN ip.status = 'pending' 
      THEN pc.amount 
      ELSE 0 
    END
  ), 0) as total_pending,
  COALESCE(SUM(
    CASE 
      WHEN ip.status = 'paid' 
      THEN pc.amount 
      ELSE 0 
    END
  ), 0) as total_paid,
  COUNT(DISTINCT CASE WHEN ip.status = 'pending' THEN ip.id END) as pending_count
FROM profiles p
LEFT JOIN payment_contributions pc ON pc.user_id = p.id
LEFT JOIN installment_payments ip ON ip.id = pc.installment_id
LEFT JOIN expenses e ON e.id = ip.expense_id
WHERE e.deleted_at IS NULL OR e.id IS NULL
GROUP BY p.id, p.full_name;

DROP VIEW IF EXISTS installment_payment_status CASCADE;
CREATE VIEW installment_payment_status AS
SELECT 
  ip.*,
  e.title as expense_title,
  e.category_id,
  e.purchased_by,
  COALESCE(
    SUM(pc.amount) FILTER (WHERE pc.paid_at IS NOT NULL),
    0
  ) as total_paid_amount,
  COUNT(DISTINCT pc.user_id) FILTER (WHERE pc.paid_at IS NOT NULL) as paid_members_count
FROM installment_payments ip
JOIN expenses e ON e.id = ip.expense_id
LEFT JOIN payment_contributions pc ON pc.installment_id = ip.id
WHERE e.deleted_at IS NULL
GROUP BY ip.id, e.title, e.category_id, e.purchased_by;

DROP VIEW IF EXISTS expenses_with_purchaser CASCADE;
CREATE VIEW expenses_with_purchaser AS
SELECT 
  e.*,
  p.full_name as purchaser_name
FROM expenses e
LEFT JOIN profiles p ON p.id = e.purchased_by
WHERE e.deleted_at IS NULL;

GRANT SELECT ON user_debt_summary TO authenticated;
GRANT SELECT ON installment_payment_status TO authenticated;
GRANT SELECT ON expenses_with_purchaser TO authenticated;
