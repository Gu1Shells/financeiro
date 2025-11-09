/*
  # Create Comprehensive Audit Logs System

  1. New Tables
    - `audit_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `action` (text: 'create', 'update', 'delete')
      - `entity_type` (text: 'expense', 'installment', 'payment', etc)
      - `entity_id` (uuid)
      - `description` (text)
      - `old_values` (jsonb)
      - `new_values` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - All authenticated users can read audit logs
    - Only system can insert logs (via triggers)
*/

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  entity_type text NOT NULL,
  entity_id uuid,
  description text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE OR REPLACE FUNCTION log_expense_changes()
RETURNS TRIGGER AS $$
DECLARE
  action_description text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    action_description := 'Despesa "' || OLD.title || '" excluída - Valor: R$ ' ||
                         (OLD.total_amount / 100.0)::numeric(10,2);
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, old_values)
    VALUES (
      auth.uid(),
      'delete',
      'expense',
      OLD.id,
      action_description,
      to_jsonb(OLD)
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    action_description := 'Despesa "' || NEW.title || '" atualizada';
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, old_values, new_values)
    VALUES (
      auth.uid(),
      'update',
      'expense',
      NEW.id,
      action_description,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    action_description := 'Despesa "' || NEW.title || '" criada - Valor: R$ ' ||
                         (NEW.total_amount / 100.0)::numeric(10,2);
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, new_values)
    VALUES (
      auth.uid(),
      'create',
      'expense',
      NEW.id,
      action_description,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS expense_audit_trigger ON expenses;
CREATE TRIGGER expense_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION log_expense_changes();

CREATE OR REPLACE FUNCTION log_installment_payment()
RETURNS TRIGGER AS $$
DECLARE
  expense_title text;
  action_description text;
BEGIN
  SELECT title INTO expense_title FROM expenses WHERE id = NEW.expense_id;

  IF TG_OP = 'UPDATE' AND OLD.status != 'paid' AND NEW.status = 'paid' THEN
    action_description := 'Parcela ' || NEW.installment_number || ' de "' || expense_title ||
                         '" paga - Valor: R$ ' || (NEW.amount / 100.0)::numeric(10,2);
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, old_values, new_values)
    VALUES (
      auth.uid(),
      'update',
      'installment',
      NEW.id,
      action_description,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS installment_payment_audit_trigger ON installment_payments;
CREATE TRIGGER installment_payment_audit_trigger
  AFTER UPDATE ON installment_payments
  FOR EACH ROW
  EXECUTE FUNCTION log_installment_payment();