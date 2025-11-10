/*
  # Create User Payment Details View
  
  1. Purpose
    - Creates a view showing payment details per user
    - Shows each user's contribution to each installment
    - Used in the Payment Status Report "Details" view
  
  2. Data Included
    - Installment details (number, amount, due date, status)
    - Expense details (title, category)
    - User details (id, name)
    - Payment details (amount paid, payment status)
  
  3. Security
    - View accessible to authenticated users via RLS
*/

DROP VIEW IF EXISTS user_payment_details CASCADE;

CREATE VIEW user_payment_details AS
SELECT 
  pc.id as contribution_id,
  pc.installment_id,
  pc.user_id,
  p.full_name as user_name,
  pc.amount as paid_amount,
  CASE 
    WHEN pc.paid_at IS NOT NULL THEN 'paid'
    ELSE 'pending'
  END as user_payment_status,
  ip.installment_number,
  ip.amount as installment_amount,
  ip.due_date,
  ip.status as installment_status,
  e.id as expense_id,
  e.title as expense_title,
  cat.name as expense_category
FROM payment_contributions pc
JOIN installment_payments ip ON ip.id = pc.installment_id
JOIN expenses e ON e.id = ip.expense_id
LEFT JOIN expense_categories cat ON cat.id = e.category_id
LEFT JOIN profiles p ON p.id = pc.user_id
WHERE e.deleted_at IS NULL;

GRANT SELECT ON user_payment_details TO authenticated;
