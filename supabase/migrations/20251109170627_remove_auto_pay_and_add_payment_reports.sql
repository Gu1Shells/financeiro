/*
  # Correção do Sistema de Pagamento e Relatórios

  ## Mudanças

  ### 1. Remover Sistema de Pagamento Automático
  - Remover trigger de pagamento automático
  - Remover função auto_pay_purchaser_installments
  - Manter campo purchased_by apenas para registro
  - Remover campo auto_pay_purchaser

  ### 2. Criar View para Relatórios de Pagamento
  - View que mostra quem pagou cada parcela
  - View que mostra quem ainda deve pagar
  - Agrupa por usuário e despesa

  ### 3. Importante
  - O comprador NÃO tem pagamento automático
  - Todos os sócios pagam juntos usando a opção "Todos"
  - Relatórios mostram claramente quem pagou e quem deve
*/

-- ============================================
-- 1. REMOVER SISTEMA DE PAGAMENTO AUTOMÁTICO
-- ============================================

DROP TRIGGER IF EXISTS trigger_auto_pay_purchaser ON expenses;
DROP FUNCTION IF EXISTS auto_pay_purchaser_installments();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'auto_pay_purchaser'
  ) THEN
    ALTER TABLE expenses DROP COLUMN auto_pay_purchaser;
  END IF;
END $$;

-- ============================================
-- 2. CRIAR VIEW DE STATUS DE PAGAMENTOS POR USUÁRIO
-- ============================================

CREATE OR REPLACE VIEW installment_payment_status AS
SELECT 
  ip.id as installment_id,
  ip.expense_id,
  ip.installment_number,
  ip.amount as installment_amount,
  ip.due_date,
  ip.status,
  ip.is_down_payment,
  e.title as expense_title,
  e.purchased_by,
  p.id as user_id,
  p.full_name as user_name,
  COALESCE(pc.amount, 0) as paid_amount,
  CASE 
    WHEN COALESCE(pc.amount, 0) > 0 THEN 'paid'
    ELSE 'pending'
  END as user_payment_status,
  pc.paid_at
FROM installment_payments ip
CROSS JOIN profiles p
LEFT JOIN expenses e ON e.id = ip.expense_id
LEFT JOIN payment_contributions pc 
  ON pc.installment_id = ip.id 
  AND pc.user_id = p.id
WHERE e.deleted_at IS NULL
ORDER BY ip.due_date, p.full_name;

-- ============================================
-- 3. CRIAR VIEW DE RESUMO DE DÍVIDAS POR USUÁRIO
-- ============================================

CREATE OR REPLACE VIEW user_debt_summary AS
SELECT 
  p.id as user_id,
  p.full_name,
  COUNT(DISTINCT ip.id) as total_installments,
  COUNT(DISTINCT CASE WHEN pc.id IS NOT NULL THEN ip.id END) as paid_installments,
  COUNT(DISTINCT CASE WHEN pc.id IS NULL THEN ip.id END) as pending_installments,
  COALESCE(SUM(CASE WHEN pc.id IS NULL THEN ip.amount END), 0) as total_debt,
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

-- ============================================
-- 4. CRIAR VIEW DE DESPESAS COM RESPONSÁVEL
-- ============================================

CREATE OR REPLACE VIEW expenses_with_purchaser AS
SELECT 
  e.*,
  p.full_name as purchaser_name,
  p.avatar_url as purchaser_avatar,
  COUNT(DISTINCT ip.id) as total_installments,
  COUNT(DISTINCT CASE WHEN ip.status = 'paid' THEN ip.id END) as paid_installments,
  COUNT(DISTINCT CASE WHEN ip.status = 'pending' THEN ip.id END) as pending_installments
FROM expenses e
LEFT JOIN profiles p ON p.id = e.purchased_by
LEFT JOIN installment_payments ip ON ip.expense_id = e.id
WHERE e.deleted_at IS NULL
GROUP BY e.id, p.full_name, p.avatar_url
ORDER BY e.created_at DESC;

-- ============================================
-- 5. FUNÇÃO PARA OBTER DEVEDORES DE UMA PARCELA
-- ============================================

CREATE OR REPLACE FUNCTION get_installment_debtors(installment_id_param uuid)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  should_pay numeric,
  paid_amount numeric,
  remaining_amount numeric,
  status text
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  num_users integer;
  installment_amount numeric;
BEGIN
  SELECT COUNT(*) INTO num_users FROM profiles;
  
  SELECT amount INTO installment_amount 
  FROM installment_payments 
  WHERE id = installment_id_param;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    ROUND(installment_amount / num_users, 2) as should_pay,
    COALESCE(pc.amount, 0) as paid_amount,
    ROUND(installment_amount / num_users, 2) - COALESCE(pc.amount, 0) as remaining_amount,
    CASE 
      WHEN COALESCE(pc.amount, 0) >= ROUND(installment_amount / num_users, 2) THEN 'paid'
      WHEN COALESCE(pc.amount, 0) > 0 THEN 'partial'
      ELSE 'pending'
    END as status
  FROM profiles p
  LEFT JOIN payment_contributions pc 
    ON pc.installment_id = installment_id_param 
    AND pc.user_id = p.id
  ORDER BY p.full_name;
END;
$$;

-- ============================================
-- 6. SEGURANÇA - RLS PARA VIEWS
-- ============================================

-- Views herdam as permissões das tabelas base automaticamente no Supabase

-- ============================================
-- 7. ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_payment_contributions_user_installment 
  ON payment_contributions(user_id, installment_id);

CREATE INDEX IF NOT EXISTS idx_expenses_purchased_by_not_deleted 
  ON expenses(purchased_by) WHERE deleted_at IS NULL;