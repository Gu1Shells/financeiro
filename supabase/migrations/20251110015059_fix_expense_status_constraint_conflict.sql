/*
  # Fix Expense Status Constraint Conflict

  1. Problem
    - Function check_and_update_expense_status tries to set status to 'partial' and 'pending'
    - But expenses table constraint only allows 'active' and 'paid'
    - This causes errors when second member tries to pay their share

  2. Solution
    - Update function to only use 'active' and 'paid' statuses
    - 'active' = expense is still being paid (has pending installments)
    - 'paid' = all installments are fully paid

  3. Impact
    - Fixes payment errors for multiple members
    - Maintains correct expense status tracking
*/

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
  ELSE
    UPDATE expenses
    SET status = 'active'
    WHERE id = NEW.expense_id AND status != 'active';
  END IF;

  RETURN NEW;
END;
$$;
