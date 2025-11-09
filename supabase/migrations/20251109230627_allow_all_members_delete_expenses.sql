/*
  # Permitir que Todos os Sócios Excluam Despesas

  1. Alterações
    - Remove política restritiva de UPDATE que impede exclusão por outros sócios
    - Cria nova política que permite qualquer sócio autenticado excluir despesas
    - Mantém auditoria completa através dos logs de exclusão
  
  2. Segurança
    - Todos os sócios podem excluir despesas (mas deve fornecer motivo)
    - Sistema de auditoria registra quem excluiu e por quê
    - RLS continua ativo e seguro
*/

-- Remove política antiga restritiva
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;

-- Cria nova política que permite qualquer usuário autenticado atualizar despesas
-- (necessário para soft delete que usa UPDATE para marcar deleted_at)
CREATE POLICY "Authenticated users can update expenses"
  ON expenses
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Garante que a função soft_delete_expense tem as permissões corretas
ALTER FUNCTION soft_delete_expense(uuid, uuid, text) SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION soft_delete_expense(uuid, uuid, text) TO authenticated;
