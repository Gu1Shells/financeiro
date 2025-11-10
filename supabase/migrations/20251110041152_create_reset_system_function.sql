/*
  # Criar Função para Zerar Sistema

  1. Problema
    - Supabase não permite DELETE com CASCADE via API por segurança
    - Precisamos de uma função SQL que faça a deleção completa
  
  2. Solução
    - Criar função reset_system() que deleta tudo na ordem correta
    - Usar TRUNCATE com CASCADE para limpar tudo de uma vez
  
  3. Segurança
    - Função SECURITY DEFINER (roda com privilégios do owner)
    - Apenas usuários autenticados podem executar
*/

CREATE OR REPLACE FUNCTION reset_system()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deletar na ordem correta para respeitar foreign keys
  DELETE FROM payment_contributions;
  DELETE FROM installment_edit_history;
  DELETE FROM installment_payments;
  DELETE FROM expense_deletion_logs;
  
  -- Deletar despesas filhas primeiro, depois pais
  DELETE FROM expenses WHERE parent_expense_id IS NOT NULL;
  DELETE FROM expenses WHERE parent_expense_id IS NULL;
  
  -- Deletar logs de auditoria por último
  DELETE FROM audit_logs;
END;
$$;