/*
  # Temporariamente Desabilitar Triggers de Auditoria para Debug

  1. Objetivo
    - Desabilitar temporariamente triggers de auditoria
    - Identificar qual trigger está causando o erro "table_name"
  
  2. Ação
    - Desabilita triggers de auditoria em payment_contributions
    - Permite testar o pagamento sem auditoria
*/

-- Desabilitar triggers de auditoria temporariamente
ALTER TABLE payment_contributions DISABLE TRIGGER audit_contributions_insert;
ALTER TABLE payment_contributions DISABLE TRIGGER audit_contributions_update;
ALTER TABLE payment_contributions DISABLE TRIGGER audit_contributions_delete;