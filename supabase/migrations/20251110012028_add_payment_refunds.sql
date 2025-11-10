/*
  # Add Payment Refunds System

  1. New Tables
    - `payment_refunds`
      - `id` (uuid, primary key)
      - `contribution_id` (uuid, foreign key to payment_contributions)
      - `refunded_by` (uuid, foreign key to profiles)
      - `refund_reason` (text)
      - `refunded_at` (timestamptz)
      - `refund_amount` (numeric)

  2. Changes
    - Add refunded status tracking
    - Track who made the refund and why

  3. Security
    - Enable RLS on payment_refunds table
    - Add policies for authenticated users to insert and view refunds
*/

CREATE TABLE IF NOT EXISTS payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid NOT NULL REFERENCES payment_contributions(id) ON DELETE CASCADE,
  refunded_by uuid NOT NULL REFERENCES profiles(id),
  refund_reason text NOT NULL,
  refund_amount numeric NOT NULL CHECK (refund_amount > 0),
  refunded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_contribution 
  ON payment_refunds(contribution_id);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_refunded_by 
  ON payment_refunds(refunded_by);

ALTER TABLE payment_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all refunds"
  ON payment_refunds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create refunds"
  ON payment_refunds FOR INSERT
  TO authenticated
  WITH CHECK (refunded_by = auth.uid());

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
    metadata
  ) VALUES (
    NEW.refunded_by,
    'refund',
    'payment',
    NEW.contribution_id,
    'Pagamento estornado',
    jsonb_build_object(
      'reason', NEW.refund_reason,
      'amount', NEW.refund_amount,
      'expense_title', expense_rec.title,
      'installment_number', installment_rec.installment_number
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payment_refund_audit_trigger ON payment_refunds;
CREATE TRIGGER payment_refund_audit_trigger
  AFTER INSERT ON payment_refunds
  FOR EACH ROW
  EXECUTE FUNCTION log_payment_refund();
