/*
  # Fix Installment Status Calculation with Rounding Tolerance

  1. Changes
    - Update update_installment_status function to handle floating point rounding errors
    - Add 0.01 tolerance when comparing paid amount vs installment amount
    - Ensures parcels are marked as paid even with minor rounding differences

  2. Impact
    - Fixes issue where R$ 83.33 couldn't be fully paid due to rounding
    - Allows final payment to complete even if off by 1 cent
*/

CREATE OR REPLACE FUNCTION update_installment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  total_paid numeric;
  installment_amount numeric;
  tolerance numeric := 0.01;
BEGIN
  SELECT amount INTO installment_amount
  FROM installment_payments
  WHERE id = COALESCE(NEW.installment_id, OLD.installment_id);

  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM payment_contributions
  WHERE installment_id = COALESCE(NEW.installment_id, OLD.installment_id);

  IF total_paid >= (installment_amount - tolerance) THEN
    UPDATE installment_payments
    SET status = 'paid'
    WHERE id = COALESCE(NEW.installment_id, OLD.installment_id);
  ELSIF total_paid > 0 THEN
    UPDATE installment_payments
    SET status = 'partial'
    WHERE id = COALESCE(NEW.installment_id, OLD.installment_id);
  ELSE
    UPDATE installment_payments
    SET status = 'pending'
    WHERE id = COALESCE(NEW.installment_id, OLD.installment_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
