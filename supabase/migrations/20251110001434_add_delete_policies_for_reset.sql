/*
  # Add DELETE policies for system reset functionality

  1. Changes
    - Add DELETE policy for payment_contributions (allow all authenticated users)
    - Add DELETE policy for installment_payments (allow all authenticated users)
    - Add DELETE policy for installment_edit_history (allow all authenticated users)
    - Add DELETE policy for audit_logs (allow all authenticated users)
    - Add DELETE policy for expense_deletion_logs (allow all authenticated users)
  
  2. Security
    - These policies allow authenticated users to delete data
    - Required for system reset functionality
    - All users in the system should be trusted partners/members
*/

-- Drop old restrictive policy for payment_contributions
DROP POLICY IF EXISTS "Users can delete own contributions" ON payment_contributions;

-- Add new DELETE policies that allow all authenticated users to delete
CREATE POLICY "Authenticated users can delete contributions"
  ON payment_contributions
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete installments"
  ON installment_payments
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete edit history"
  ON installment_edit_history
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete audit logs"
  ON audit_logs
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete deletion logs"
  ON expense_deletion_logs
  FOR DELETE
  TO authenticated
  USING (true);