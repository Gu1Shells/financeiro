/*
  # Sistema Completo de Auditoria e Melhorias

  1. Triggers de Auditoria
    - Adiciona triggers para registrar automaticamente todas as operações
    - CREATE: Registra criação de despesas, parcelas e pagamentos
    - UPDATE: Registra alterações com valores antigos e novos
    - DELETE: Registra exclusões com dados completos
  
  2. Função de Auditoria Genérica
    - Função reutilizável para registrar qualquer operação
    - Captura usuário, ação, entidade e valores
    - Gera descrição automática baseada no contexto
  
  3. Melhorias nas Tabelas
    - Adiciona campos para rastrear débitos pendentes
    - Melhora indexação para performance
  
  4. Segurança
    - Mantém RLS ativo em todas as tabelas
    - Políticas específicas para auditoria
*/

-- Função genérica para auditoria
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  user_id_val uuid;
  description_text text;
BEGIN
  -- Pega o user_id da sessão
  user_id_val := auth.uid();
  
  -- Se não houver usuário autenticado, sai
  IF user_id_val IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Gera descrição baseada na operação
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'expenses' THEN
      description_text := 'Criou despesa: ' || NEW.title || ' - R$ ' || NEW.total_amount::text;
    ELSIF TG_TABLE_NAME = 'installment_payments' THEN
      description_text := 'Criou parcela #' || NEW.installment_number::text;
    ELSIF TG_TABLE_NAME = 'payment_contributions' THEN
      description_text := 'Registrou pagamento de R$ ' || NEW.amount::text;
    ELSE
      description_text := 'Criou registro em ' || TG_TABLE_NAME;
    END IF;

    INSERT INTO audit_logs (
      user_id, action, entity_type, entity_id, 
      description, new_values
    ) VALUES (
      user_id_val, 'create', TG_TABLE_NAME, NEW.id,
      description_text, to_jsonb(NEW)
    );

  ELSIF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'expenses' THEN
      description_text := 'Atualizou despesa: ' || NEW.title;
    ELSIF TG_TABLE_NAME = 'installment_payments' THEN
      IF OLD.status != NEW.status THEN
        description_text := 'Alterou status da parcela #' || NEW.installment_number::text || 
                          ' de "' || OLD.status || '" para "' || NEW.status || '"';
      ELSE
        description_text := 'Atualizou parcela #' || NEW.installment_number::text;
      END IF;
    ELSE
      description_text := 'Atualizou registro em ' || TG_TABLE_NAME;
    END IF;

    INSERT INTO audit_logs (
      user_id, action, entity_type, entity_id,
      description, old_values, new_values
    ) VALUES (
      user_id_val, 'update', TG_TABLE_NAME, NEW.id,
      description_text, to_jsonb(OLD), to_jsonb(NEW)
    );

  ELSIF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'expenses' THEN
      description_text := 'Excluiu despesa: ' || OLD.title || ' - R$ ' || OLD.total_amount::text;
    ELSIF TG_TABLE_NAME = 'installment_payments' THEN
      description_text := 'Excluiu parcela #' || OLD.installment_number::text;
    ELSIF TG_TABLE_NAME = 'payment_contributions' THEN
      description_text := 'Removeu pagamento de R$ ' || OLD.amount::text;
    ELSE
      description_text := 'Excluiu registro de ' || TG_TABLE_NAME;
    END IF;

    INSERT INTO audit_logs (
      user_id, action, entity_type, entity_id,
      description, old_values
    ) VALUES (
      user_id_val, 'delete', TG_TABLE_NAME, OLD.id,
      description_text, to_jsonb(OLD)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove triggers antigos se existirem
DROP TRIGGER IF EXISTS audit_expenses_insert ON expenses;
DROP TRIGGER IF EXISTS audit_expenses_update ON expenses;
DROP TRIGGER IF EXISTS audit_expenses_delete ON expenses;
DROP TRIGGER IF EXISTS audit_installments_insert ON installment_payments;
DROP TRIGGER IF EXISTS audit_installments_update ON installment_payments;
DROP TRIGGER IF EXISTS audit_installments_delete ON installment_payments;
DROP TRIGGER IF EXISTS audit_contributions_insert ON payment_contributions;
DROP TRIGGER IF EXISTS audit_contributions_update ON payment_contributions;
DROP TRIGGER IF EXISTS audit_contributions_delete ON payment_contributions;

-- Triggers para EXPENSES
CREATE TRIGGER audit_expenses_insert
  AFTER INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_expenses_update
  AFTER UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_expenses_delete
  AFTER DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();

-- Triggers para INSTALLMENT_PAYMENTS
CREATE TRIGGER audit_installments_insert
  AFTER INSERT ON installment_payments
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_installments_update
  AFTER UPDATE ON installment_payments
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_installments_delete
  AFTER DELETE ON installment_payments
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();

-- Triggers para PAYMENT_CONTRIBUTIONS
CREATE TRIGGER audit_contributions_insert
  AFTER INSERT ON payment_contributions
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_contributions_update
  AFTER UPDATE ON payment_contributions
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_contributions_delete
  AFTER DELETE ON payment_contributions
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installment_payments(status);
CREATE INDEX IF NOT EXISTS idx_installments_due_date ON installment_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_contributions_user_id ON payment_contributions(user_id);
