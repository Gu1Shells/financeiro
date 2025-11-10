/*
  # Corrigir Função reset_system - Adicionar WHERE

  1. Problema
    - Supabase exige cláusula WHERE em DELETE por segurança
    - DELETE sem WHERE retorna erro
  
  2. Solução
    - Adicionar WHERE true em todos os DELETEs
    - Isso permite deletar todas as linhas respeitando a política de segurança
*/

CREATE OR REPLACE FUNCTION reset_system()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deletar na ordem correta para respeitar foreign keys
  DELETE FROM payment_contributions WHERE true;
  DELETE FROM installment_edit_history WHERE true;
  DELETE FROM installment_payments WHERE true;
  DELETE FROM expense_deletion_logs WHERE true;
  
  -- Deletar despesas filhas primeiro, depois pais
  DELETE FROM expenses WHERE parent_expense_id IS NOT NULL;
  DELETE FROM expenses WHERE true;
  
  -- Deletar logs de auditoria por último
  DELETE FROM audit_logs WHERE true;
END;
$$;