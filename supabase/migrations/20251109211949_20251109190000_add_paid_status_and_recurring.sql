/*
  # Add Paid Status and Recurring Expenses

  1. Changes
    - Add `status` column to `expenses` table
      - Values: 'active', 'paid'
      - Default: 'active'
    - Add `is_recurring` column to `expenses` table
      - Boolean to mark recurring expenses
      - Default: false
    - Add `recurrence_day` column to `expenses` table
      - Day of month for recurring expenses (1-31)
      - Nullable
    - Add `parent_expense_id` column to `expenses` table
      - Links to original recurring expense
      - Nullable

  2. Security
    - Existing RLS policies apply
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'status'
  ) THEN
    ALTER TABLE expenses ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'paid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'is_recurring'
  ) THEN
    ALTER TABLE expenses ADD COLUMN is_recurring boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'recurrence_day'
  ) THEN
    ALTER TABLE expenses ADD COLUMN recurrence_day integer CHECK (recurrence_day >= 1 AND recurrence_day <= 31);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'parent_expense_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN parent_expense_id uuid REFERENCES expenses(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON expenses(is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_expenses_parent ON expenses(parent_expense_id);