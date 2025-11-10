/*
  # Corrigir Duplicação de Despesas Fixas

  1. Problema
    - Dois triggers fazendo a mesma coisa: regenerate_fixed_expense_trigger e trigger_auto_regenerate_fixed_expense
    - Quando paga uma despesa fixa, ambos são disparados
    - Resultado: 2 despesas fixas criadas com mesma data
  
  2. Solução
    - Remover o trigger duplicado (regenerate_fixed_expense_trigger)
    - Manter apenas trigger_auto_regenerate_fixed_expense
    - Garantir que só cria UMA nova despesa quando pagar
  
  3. Mudanças
    - DROP TRIGGER regenerate_fixed_expense_trigger
    - Mantém auto_regenerate_fixed_expense que já funciona corretamente
*/

-- Remover o trigger duplicado
DROP TRIGGER IF EXISTS regenerate_fixed_expense_trigger ON expenses;

-- Remover a função duplicada também (não é mais usada)
DROP FUNCTION IF EXISTS regenerate_fixed_expense();