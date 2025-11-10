/*
  # Fix Audit Log Functions - Remove metadata references
  
  1. Purpose
    - Fix functions that reference non-existent 'metadata' column
    - Update to use correct columns: old_values, new_values
  
  2. Changes
    - Update log_installment_reopening function
    - Update log_audit_event function
  
  3. Notes
    - The audit_logs table uses old_values/new_values, not metadata
    - This fixes the error when deleting payment_contributions
*/

-- Fix log_installment_reopening function
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
        'reason', NEW.reopen_reason,
        'reopened_at', NEW.reopened_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix log_audit_event function
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_description text,
  p_metadata jsonb DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    description,
    new_values
  ) VALUES (
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_description,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
