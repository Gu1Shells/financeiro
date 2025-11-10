/*
  # Fix Audit Logs Column Names in Recurring Expense Function

  1. Problem
    - Function `auto_regenerate_fixed_expense` uses old column names
    - Old: table_name, record_id, changed_by, changes
    - New: entity_type, entity_id, user_id, new_values
  
  2. Changes
    - Update INSERT statement in the function to use correct column names
    - Ensures compatibility with current audit_logs table structure
*/

-- Recriar a função com os nomes corretos das colunas
CREATE OR REPLACE FUNCTION auto_regenerate_fixed_expense()
RETURNS TRIGGER AS $$
DECLARE
  v_next_start_date date;
  v_new_expense_id uuid;
BEGIN
  -- Só processa se for despesa fixa que está sendo marcada como paga
  IF NEW.is_fixed = true AND NEW.status = 'paid' AND OLD.status != 'paid' THEN
    -- Calcula a próxima data de início (próximo mês)
    v_next_start_date := NEW.start_date + INTERVAL '1 month';
    
    -- Cria uma nova despesa para o próximo mês
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
      late_fee_percentage,
      parent_expense_id,
      status
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
      NEW.late_fee_percentage,
      NEW.id,
      'active'
    )
    RETURNING id INTO v_new_expense_id;
    
    -- Registra no audit log com os nomes corretos das colunas
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      description,
      new_values
    )
    VALUES (
      NEW.created_by,
      'create',
      'expenses',
      v_new_expense_id,
      'Despesa fixa regenerada automaticamente: ' || NEW.title,
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

-- Recriar o trigger
DROP TRIGGER IF EXISTS trigger_auto_regenerate_fixed_expense ON expenses;
CREATE TRIGGER trigger_auto_regenerate_fixed_expense
  AFTER UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION auto_regenerate_fixed_expense();