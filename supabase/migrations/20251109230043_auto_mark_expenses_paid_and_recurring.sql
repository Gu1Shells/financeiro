/*
  # Sistema Automático de Status e Despesas Recorrentes

  1. Trigger Auto-Status
    - Marca automaticamente expense como 'paid' quando todas parcelas pagas
    - Verifica se há despesas recorrentes e gera próxima
  
  2. Sistema de Despesas Recorrentes
    - Quando uma despesa fixa é marcada como paga
    - Gera automaticamente a despesa do próximo mês
    - Mantém todas as configurações (valor, categoria, etc)
  
  3. Segurança
    - Mantém RLS e auditoria ativa
*/

-- Função para verificar e atualizar status da despesa
CREATE OR REPLACE FUNCTION check_and_update_expense_status()
RETURNS TRIGGER AS $$
DECLARE
  total_installments int;
  paid_installments int;
  expense_record record;
  next_month_date date;
  new_expense_id uuid;
BEGIN
  -- Pega informações da despesa
  SELECT * INTO expense_record
  FROM expenses
  WHERE id = NEW.expense_id;

  -- Se despesa não existe ou já está paga, sai
  IF expense_record IS NULL OR expense_record.status = 'paid' THEN
    RETURN NEW;
  END IF;

  -- Conta total de parcelas
  SELECT COUNT(*) INTO total_installments
  FROM installment_payments
  WHERE expense_id = NEW.expense_id;

  -- Conta parcelas pagas
  SELECT COUNT(*) INTO paid_installments
  FROM installment_payments
  WHERE expense_id = NEW.expense_id
    AND status = 'paid';

  -- Se todas parcelas foram pagas, marca expense como paid
  IF paid_installments = total_installments AND total_installments > 0 THEN
    UPDATE expenses
    SET status = 'paid',
        updated_at = now()
    WHERE id = NEW.expense_id;

    -- Se é despesa recorrente, cria a próxima
    IF expense_record.is_recurring AND expense_record.recurrence_day IS NOT NULL THEN
      -- Calcula próximo mês baseado no dia de recorrência
      next_month_date := (date_trunc('month', CURRENT_DATE) + interval '1 month' + 
                         (expense_record.recurrence_day - 1 || ' days')::interval)::date;
      
      -- Cria nova despesa para próximo mês
      INSERT INTO expenses (
        title,
        total_amount,
        category_id,
        created_by,
        installments,
        is_fixed,
        start_date,
        notes,
        priority,
        status,
        is_recurring,
        recurrence_day,
        parent_expense_id
      ) VALUES (
        expense_record.title,
        expense_record.total_amount,
        expense_record.category_id,
        expense_record.created_by,
        expense_record.installments,
        expense_record.is_fixed,
        next_month_date,
        expense_record.notes,
        expense_record.priority,
        'active',
        true,
        expense_record.recurrence_day,
        expense_record.id
      )
      RETURNING id INTO new_expense_id;

      -- Cria parcelas para nova despesa
      INSERT INTO installment_payments (
        expense_id,
        installment_number,
        amount,
        due_date,
        status
      )
      SELECT 
        new_expense_id,
        installment_number,
        expense_record.total_amount / expense_record.installments,
        next_month_date + ((installment_number - 1) * interval '1 month'),
        'pending'
      FROM generate_series(1, expense_record.installments) AS installment_number;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS update_expense_status_on_payment ON installment_payments;

-- Cria trigger para atualizar status quando parcela for paga
CREATE TRIGGER update_expense_status_on_payment
  AFTER UPDATE OF status ON installment_payments
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND OLD.status != 'paid')
  EXECUTE FUNCTION check_and_update_expense_status();

-- Cria trigger também para inserção (caso parcela seja criada já paga)
CREATE TRIGGER update_expense_status_on_payment_insert
  AFTER INSERT ON installment_payments
  FOR EACH ROW
  WHEN (NEW.status = 'paid')
  EXECUTE FUNCTION check_and_update_expense_status();
