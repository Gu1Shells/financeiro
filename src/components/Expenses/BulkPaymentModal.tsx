import { useState, useEffect } from 'react';
import { X, DollarSign, Users, CheckSquare, Square } from 'lucide-react';
import { supabase, InstallmentPayment, Profile } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

interface BulkPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseId: string;
  onSuccess: () => void;
}

export const BulkPaymentModal = ({ isOpen, onClose, expenseId, onSuccess }: BulkPaymentModalProps) => {
  const [installments, setInstallments] = useState<InstallmentPayment[]>([]);
  const [selectedInstallments, setSelectedInstallments] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedPayers, setSelectedPayers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, expenseId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [installmentsRes, profilesRes] = await Promise.all([
        supabase
          .from('installment_payments')
          .select('*')
          .eq('expense_id', expenseId)
          .eq('status', 'pending')
          .order('installment_number'),
        supabase.from('profiles').select('*'),
      ]);

      setInstallments(installmentsRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleInstallment = (id: string) => {
    const newSelection = new Set(selectedInstallments);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedInstallments(newSelection);
  };

  const togglePayer = (id: string) => {
    const newSelection = new Set(selectedPayers);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedPayers(newSelection);
  };

  const selectAllInstallments = () => {
    if (selectedInstallments.size === installments.length) {
      setSelectedInstallments(new Set());
    } else {
      setSelectedInstallments(new Set(installments.map(i => i.id)));
    }
  };

  const selectAllPayers = () => {
    if (selectedPayers.size === profiles.length) {
      setSelectedPayers(new Set());
    } else {
      setSelectedPayers(new Set(profiles.map(p => p.id)));
    }
  };

  const totalAmount = Array.from(selectedInstallments).reduce((sum, id) => {
    const installment = installments.find(i => i.id === id);
    return sum + (installment ? Number(installment.amount) : 0);
  }, 0);

  const amountPerPayer = selectedPayers.size > 0 ? totalAmount / selectedPayers.size : 0;

  const handleSubmit = async () => {
    if (selectedInstallments.size === 0) {
      showToast('Selecione pelo menos uma parcela', 'error');
      return;
    }

    if (selectedPayers.size === 0) {
      showToast('Selecione pelo menos um pagador', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const contributions: any[] = [];

      Array.from(selectedInstallments).forEach(installmentId => {
        const installment = installments.find(i => i.id === installmentId);
        if (!installment) return;

        const installmentAmount = Number(installment.amount);
        const sharePerPayer = installmentAmount / selectedPayers.size;

        Array.from(selectedPayers).forEach(payerId => {
          contributions.push({
            installment_id: installmentId,
            user_id: payerId,
            amount: sharePerPayer,
            notes: `Quitação múltipla - ${selectedInstallments.size} parcela(s)`,
          });
        });
      });

      const { error } = await supabase
        .from('payment_contributions')
        .insert(contributions);

      if (error) throw error;

      showToast(
        `${selectedInstallments.size} parcela(s) quitada(s) com sucesso!`,
        'success'
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error processing bulk payment:', error);
      showToast('Erro ao processar quitação múltipla', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border-2 border-emerald-200 dark:border-emerald-800">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Quitação Múltipla de Parcelas</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2 flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                Selecione as Parcelas
              </h3>
              <button
                onClick={selectAllInstallments}
                className="mb-3 text-sm text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 font-medium"
              >
                {selectedInstallments.size === installments.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
              </button>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {installments.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Nenhuma parcela pendente</p>
                ) : (
                  installments.map((installment) => (
                    <label
                      key={installment.id}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedInstallments.has(installment.id)}
                        onChange={() => toggleInstallment(installment.id)}
                        className="w-5 h-5 text-emerald-500 rounded focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-800 dark:text-white">
                            Parcela #{installment.installment_number}
                          </span>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Vencimento: {new Date(installment.due_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span className="font-bold text-gray-800 dark:text-white">
                          R$ {Number(installment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Quem Ajudou a Pagar?
              </h3>
              <button
                onClick={selectAllPayers}
                className="mb-3 text-sm text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 font-medium"
              >
                {selectedPayers.size === profiles.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
              <div className="space-y-2">
                {profiles.map((profile) => (
                  <label
                    key={profile.id}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPayers.has(profile.id)}
                      onChange={() => togglePayer(profile.id)}
                      className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-800 dark:text-white">
                      {profile.full_name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {selectedInstallments.size > 0 && selectedPayers.size > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-3">Resumo</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Parcelas selecionadas:</span>
                    <span className="font-bold text-gray-800 dark:text-white">{selectedInstallments.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Valor total:</span>
                    <span className="font-bold text-gray-800 dark:text-white">
                      R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Pagadores:</span>
                    <span className="font-bold text-gray-800 dark:text-white">{selectedPayers.size}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-amber-300 dark:border-amber-700">
                    <span className="text-amber-900 dark:text-amber-100 font-semibold">Valor por pessoa:</span>
                    <span className="font-bold text-amber-900 dark:text-amber-100 text-lg">
                      R$ {amountPerPayer.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedInstallments.size === 0 || selectedPayers.size === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30"
            >
              {isSubmitting ? 'Processando...' : 'Confirmar Quitação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
