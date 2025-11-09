/*
  # Adicionar Sistema de Exclusão com Logs e Prioridades

  ## Mudanças

  1. Nova Tabela: expense_deletion_logs
    - `id` (uuid, PK)
    - `expense_id` (uuid) - ID da despesa excluída
    - `expense_title` (text) - Título da despesa
    - `expense_amount` (numeric) - Valor da despesa
    - `deleted_by` (uuid, FK) - Quem excluiu
    - `deletion_reason` (text) - Motivo da exclusão
    - `deleted_at` (timestamp) - Data da exclusão
    - `expense_data` (jsonb) - Dados completos da despesa

  2. Modificações na tabela expenses
    - Adicionar campo `priority` (text) - baixa, media, alta, urgente
    - Adicionar campo `deleted_at` (timestamp, nullable)
    - Adicionar campo `deleted_by` (uuid, nullable)

  3. Segurança
    - RLS habilitado em expense_deletion_logs
    - Políticas para visualização dos logs
    - Soft delete nas despesas
*/

-- Adicionar campos de prioridade e soft delete à tabela expenses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'priority'
  ) THEN
    ALTER TABLE expenses ADD COLUMN priority text NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE expenses ADD COLUMN deleted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE expenses ADD COLUMN deleted_by uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Criar índice para filtrar despesas não excluídas
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses(deleted_at) WHERE deleted_at IS NULL;

-- Criar tabela de logs de exclusão
CREATE TABLE IF NOT EXISTS expense_deletion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL,
  expense_title text NOT NULL,
  expense_amount numeric(10, 2) NOT NULL,
  deleted_by uuid REFERENCES profiles(id) NOT NULL,
  deletion_reason text NOT NULL,
  deleted_at timestamptz DEFAULT now(),
  expense_data jsonb NOT NULL
);

ALTER TABLE expense_deletion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all deletion logs"
  ON expense_deletion_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create deletion logs"
  ON expense_deletion_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = deleted_by);

-- Criar índice para buscas nos logs
CREATE INDEX IF NOT EXISTS idx_deletion_logs_deleted_by ON expense_deletion_logs(deleted_by);
CREATE INDEX IF NOT EXISTS idx_deletion_logs_deleted_at ON expense_deletion_logs(deleted_at);

-- Função para soft delete com log
CREATE OR REPLACE FUNCTION soft_delete_expense(
  expense_id_param uuid,
  user_id_param uuid,
  reason_param text
)
RETURNS void AS $$
DECLARE
  expense_record record;
BEGIN
  -- Buscar a despesa
  SELECT * INTO expense_record
  FROM expenses
  WHERE id = expense_id_param AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Despesa não encontrada ou já foi excluída';
  END IF;

  -- Criar log de exclusão
  INSERT INTO expense_deletion_logs (
    expense_id,
    expense_title,
    expense_amount,
    deleted_by,
    deletion_reason,
    expense_data
  ) VALUES (
    expense_record.id,
    expense_record.title,
    expense_record.total_amount,
    user_id_param,
    reason_param,
    to_jsonb(expense_record)
  );

  -- Marcar despesa como excluída (soft delete)
  UPDATE expenses
  SET deleted_at = now(),
      deleted_by = user_id_param
  WHERE id = expense_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar políticas para filtrar despesas excluídas
DROP POLICY IF EXISTS "Users can view all expenses" ON expenses;
CREATE POLICY "Users can view all expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Comentário útil
COMMENT ON COLUMN expenses.priority IS 'Prioridade da despesa: baixa, media, alta, urgente';
COMMENT ON TABLE expense_deletion_logs IS 'Registro de todas as despesas excluídas com motivo e dados históricos';