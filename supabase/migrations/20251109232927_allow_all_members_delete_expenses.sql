/*
  # Allow All Members to Delete Expenses

  1. Security Changes
    - Update DELETE policy on expenses table
    - Allow any authenticated user to soft-delete expenses
    - Maintain audit trail through deleted_by field
  
  2. Changes Made
    - Drop old restrictive DELETE policy
    - Create new permissive DELETE policy for all authenticated users
*/

-- Drop the old restrictive DELETE policy
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

-- Create new permissive DELETE policy
CREATE POLICY "Authenticated users can delete expenses"
  ON expenses
  FOR DELETE
  TO authenticated
  USING (true);
