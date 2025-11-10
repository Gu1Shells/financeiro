/*
  # Fix User Payment Details View - Include All Installments
  
  1. Problem
    - Previous view only showed installments with existing payment_contributions
    - Pending installments without contributions were not visible
  
  2. Solution
    - Use CROSS JOIN with profiles to create a row for each user for each installment
    - LEFT JOIN with payment_contributions to get payment data if it exists
    - Shows all pending and paid installments for all users
  
  3. Impact
    - Payment Status Report "Details" now shows all installments
    - Both pending and paid contributions visible
*/

DROP VIEW IF EXISTS user_payment_details CASCADE;

CREATE VIEW user_payment_details AS
SELECT 
  COALESCE(pc.id, gen_random_uuid()) as contribution_id,
  ip.id as installment_id,
  p.id as user_id,
  p.full_name as user_name,
  COALESCE(pc.amount, 0) as paid_amount,
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
  COALESCE(cat.name, 'Sem categoria') as expense_category
FROM installment_payments ip
CROSS JOIN profiles p
JOIN expenses e ON e.id = ip.expense_id
LEFT JOIN expense_categories cat ON cat.id = e.category_id
LEFT JOIN payment_contributions pc ON pc.installment_id = ip.id AND pc.user_id = p.id
WHERE e.deleted_at IS NULL;

GRANT SELECT ON user_payment_details TO authenticated;
