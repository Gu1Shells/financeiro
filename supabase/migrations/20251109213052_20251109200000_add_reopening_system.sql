/*
  # Add Reopening System for Paid Installments

  1. Changes
    - Add `reopened_at` to installment_payments
    - Add `reopened_by` to installment_payments
    - Add `reopening_reason` to installment_payments
    - Add `times_reopened` counter to installment_payments
    - Log reopening actions in audit_logs

  2. Security
    - Existing RLS policies apply
    - Audit trail for all reopenings
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installment_payments' AND column_name = 'reopened_at'
  ) THEN
    ALTER TABLE installment_payments ADD COLUMN reopened_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installment_payments' AND column_name = 'reopened_by'
  ) THEN
    ALTER TABLE installment_payments ADD COLUMN reopened_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installment_payments' AND column_name = 'reopening_reason'
  ) THEN
    ALTER TABLE installment_payments ADD COLUMN reopening_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'installment_payments' AND column_name = 'times_reopened'
  ) THEN
    ALTER TABLE installment_payments ADD COLUMN times_reopened integer DEFAULT 0;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION log_installment_reopening()
RETURNS TRIGGER AS $$
DECLARE
  expense_title text;
  action_description text;
BEGIN
  SELECT title INTO expense_title FROM expenses WHERE id = NEW.expense_id;

  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' AND NEW.status != 'paid' AND NEW.reopening_reason IS NOT NULL THEN
    action_description := 'Parcela ' || NEW.installment_number || ' de "' || expense_title ||
                         '" reaberta - Motivo: ' || NEW.reopening_reason;

    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, old_values, new_values)
    VALUES (
      auth.uid(),
      'update',
      'installment_reopening',
      NEW.id,
      action_description,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS installment_reopening_audit_trigger ON installment_payments;
CREATE TRIGGER installment_reopening_audit_trigger
  AFTER UPDATE ON installment_payments
  FOR EACH ROW
  EXECUTE FUNCTION log_installment_reopening();