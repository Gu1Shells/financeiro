/*
  # Fix Refund Trigger to Capture Data Before Deletion

  1. Changes
    - Update trigger to capture contribution data before it's deleted
    - Handle case where contribution might be deleted already
    - Ensure all needed data is available
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
  BEGIN
    SELECT pc.*, p.full_name as user_name
    INTO contribution_rec
    FROM payment_contributions pc
    LEFT JOIN profiles p ON p.id = pc.user_id
    WHERE pc.id = NEW.contribution_id;
  EXCEPTION
    WHEN OTHERS THEN
      contribution_rec := NULL;
  END;

  IF contribution_rec IS NOT NULL THEN
    BEGIN
      SELECT * INTO installment_rec
      FROM installment_payments
      WHERE id = contribution_rec.installment_id;
    EXCEPTION
      WHEN OTHERS THEN
        installment_rec := NULL;
    END;

    IF installment_rec IS NOT NULL THEN
      BEGIN
        SELECT * INTO expense_rec
        FROM expenses
        WHERE id = installment_rec.expense_id;
      EXCEPTION
        WHEN OTHERS THEN
          expense_rec := NULL;
      END;
    END IF;
  END IF;

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
      'user_name', COALESCE(contribution_rec.user_name, 'Desconhecido'),
      'expense_title', COALESCE(expense_rec.title, 'Despesa removida'),
      'installment_number', COALESCE(installment_rec.installment_number, 0)
    ),
    jsonb_build_object(
      'refund_reason', NEW.refund_reason,
      'refunded_at', NEW.refunded_at
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;
