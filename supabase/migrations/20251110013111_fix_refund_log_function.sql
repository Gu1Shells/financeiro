/*
  # Fix Payment Refund Log Function

  1. Changes
    - Update log_payment_refund function to use old_values/new_values instead of metadata
    - Keep all audit information in the correct columns

  2. Security
    - Maintain security and audit trail
*/

CREATE OR REPLACE FUNCTION log_payment_refund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  contribution_rec record;
  installment_rec record;
  expense_rec record;
BEGIN
  SELECT * INTO contribution_rec
  FROM payment_contributions
  WHERE id = NEW.contribution_id;

  SELECT * INTO installment_rec
  FROM installment_payments
  WHERE id = contribution_rec.installment_id;

  SELECT * INTO expense_rec
  FROM expenses
  WHERE id = installment_rec.expense_id;

  INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    description,
    old_values,
    new_values
  ) VALUES (
    NEW.refunded_by,
    'refund',
    'payment',
    NEW.contribution_id,
    'Pagamento estornado: ' || NEW.refund_reason,
    jsonb_build_object(
      'contribution_id', NEW.contribution_id,
      'amount', NEW.refund_amount,
      'expense_title', expense_rec.title,
      'installment_number', installment_rec.installment_number
    ),
    jsonb_build_object(
      'refund_reason', NEW.refund_reason,
      'refunded_at', NEW.refunded_at
    )
  );

  RETURN NEW;
END;
$$;
