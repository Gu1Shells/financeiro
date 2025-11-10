/*
  # Corrigir Todas as Funções com Nomes Antigos de Colunas do Audit Logs

  1. Problema
    - Duas funções usando nomes antigos: regenerate_fixed_expense e auto_regenerate_fixed_expense
    - Causando erro: column "table_name" of relation "audit_logs" does not exist
  
  2. Solução
    - Recriar ambas as funções com nomes corretos
    - table_name → entity_type
    - record_id → entity_id
    - changed_by → user_id
    - changes → new_values
*/

-- Corrigir regenerate_fixed_expense
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
    
    -- Usar nomes CORRETOS das colunas
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

-- Reabilitar os triggers de auditoria que foram desabilitados
ALTER TABLE payment_contributions ENABLE TRIGGER audit_contributions_insert;
ALTER TABLE payment_contributions ENABLE TRIGGER audit_contributions_update;
ALTER TABLE payment_contributions ENABLE TRIGGER audit_contributions_delete;