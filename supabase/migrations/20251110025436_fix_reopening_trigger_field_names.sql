/*
  # Fix Reopening Trigger Field Names
  
  1. Purpose
    - Fix log_installment_reopening function to use correct field name
    - Field is 'reopening_reason' not 'reopen_reason'
  
  2. Changes
    - Update function to use correct column names from installment_payments table
*/

CREATE OR REPLACE FUNCTION log_installment_reopening()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' AND NEW.status = 'pending' THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      description,
      new_values
    ) VALUES (
      NEW.reopened_by,
      'update',
      'installment',
      NEW.id,
      'Parcela reaberta',
      jsonb_build_object(
        'reason', NEW.reopening_reason,
        'reopened_at', NEW.reopened_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
