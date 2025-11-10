/*
  # Recurring Fixed Expenses System
  
  1. Purpose
    - Automatically regenerate fixed expenses when fully paid
    - Keep history of paid fixed expenses
    - Generate new expense for the next month automatically
  
  2. Changes
    - Add trigger to detect when a fixed expense is fully paid
    - Auto-create a new expense for the next month
    - Maintain all settings from the original expense
  
  3. Important Notes
    - Fixed expenses don't disappear when paid
    - New expense is created with same settings
    - Start date is set to next month
    - Amount can be 0 for variable fixed expenses (like utilities)
*/

CREATE OR REPLACE FUNCTION regenerate_fixed_expense()
RETURNS TRIGGER AS $$
DECLARE
  v_next_start_date DATE;
  v_new_expense_id UUID;
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.is_fixed = true THEN
    v_next_start_date := (NEW.start_date + INTERVAL '1 month')::DATE;
    
    INSERT INTO expenses (
      title,
      total_amount,
      category_id,
      created_by,
      installments,
      is_fixed,
      priority,
      start_date,
      notes,
      down_payment_amount,
      down_payment_method_id,
      down_payment_installments,
      remaining_payment_method_id,
      purchased_by,
      apply_late_fees,
      late_fee_percentage
    )
    VALUES (
      NEW.title,
      NEW.total_amount,
      NEW.category_id,
      NEW.created_by,
      NEW.installments,
      true,
      NEW.priority,
      v_next_start_date,
      NEW.notes,
      NEW.down_payment_amount,
      NEW.down_payment_method_id,
      NEW.down_payment_installments,
      NEW.remaining_payment_method_id,
      NEW.purchased_by,
      NEW.apply_late_fees,
      NEW.late_fee_percentage
    )
    RETURNING id INTO v_new_expense_id;
    
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      changed_by,
      changes
    )
    VALUES (
      'expenses',
      v_new_expense_id,
      'create',
      NEW.created_by,
      jsonb_build_object(
        'reason', 'auto_regenerated_fixed_expense',
        'original_expense_id', NEW.id,
        'new_start_date', v_next_start_date
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS regenerate_fixed_expense_trigger ON expenses;

CREATE TRIGGER regenerate_fixed_expense_trigger
  AFTER UPDATE OF status ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION regenerate_fixed_expense();
