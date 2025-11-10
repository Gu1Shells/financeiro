/*
  # Fix user_debt_summary View

  1. Changes
    - Recreate user_debt_summary view with correct fields
    - Add total_debt, total_paid, total_installments, paid_installments, pending_installments
    - Fix calculation to properly sum installment amounts

  2. Fields
    - user_id: User's ID
    - full_name: User's full name
    - total_installments: Total number of installments for the user
    - paid_installments: Number of paid installments
    - pending_installments: Number of pending installments
    - total_debt: Total amount of pending installments
    - total_paid: Total amount paid by the user
*/

DROP VIEW IF EXISTS user_debt_summary CASCADE;

CREATE VIEW user_debt_summary AS
SELECT
  p.id as user_id,
  p.full_name,
  COUNT(DISTINCT ip.id) as total_installments,
  COUNT(DISTINCT CASE WHEN ip.status = 'paid' THEN ip.id END) as paid_installments,
  COUNT(DISTINCT CASE WHEN ip.status = 'pending' THEN ip.id END) as pending_installments,
  COALESCE(SUM(
    CASE
      WHEN ip.status = 'pending'
      THEN ip.amount / NULLIF(e.num_members, 0)
      ELSE 0
    END
  ), 0) as total_debt,
  COALESCE(SUM(pc.amount), 0) as total_paid
FROM profiles p
CROSS JOIN installment_payments ip
LEFT JOIN expenses e ON e.id = ip.expense_id
LEFT JOIN payment_contributions pc
  ON pc.installment_id = ip.id
  AND pc.user_id = p.id
WHERE e.deleted_at IS NULL
GROUP BY p.id, p.full_name
ORDER BY total_debt DESC;

GRANT SELECT ON user_debt_summary TO authenticated;
