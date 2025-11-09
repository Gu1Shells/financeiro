import { useState } from 'react';
import { X, AlertCircle, Unlock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ReopenInstallmentModalProps {
  installment: any;
  expenseTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReopenInstallmentModal = ({
  installment,
  expenseTitle,
  onClose,
  onSuccess,
}: ReopenInstallmentModalProps) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReopen = async () => {
    if (!reason.trim()) {
      setError('Por favor, informe o motivo da reabertura');
      return;
    }

    if (reason.trim().length < 10) {
      setError('O motivo deve ter pelo menos 10 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('installment_payments')
        .update({
          status: 'pending',
          reopened_at: new Date().toISOString(),
          reopened_by: (await supabase.auth.getUser()).data.user?.id,
          reopening_reason: reason.trim(),
          times_reopened: (installment.times_reopened || 0) + 1,
        })
        .eq('id', installment.id);

      if (updateError) throw updateError;

      await supabase.from('payment_contributions').delete().eq('installment_id', installment.id);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error reopening installment:', err);
      setError(err.message || 'Erro ao reabrir parcela');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-xl">
              <Unlock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Reabrir Parcela</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Parcela {installment.installment_number} de "{expenseTitle}"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-semibold mb-1">Atenção!</p>
                <p>
                  Ao reabrir esta parcela, todos os pagamentos registrados serão removidos e a
                  parcela voltará ao status "Pendente". Esta ação ficará registrada nos logs.
                </p>
              </div>
            </div>
          </div>

          {installment.times_reopened > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Esta parcela já foi reaberta {installment.times_reopened}x anteriormente.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Motivo da Reabertura <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              placeholder="Descreva o motivo pelo qual esta parcela precisa ser reaberta..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Mínimo de 10 caracteres
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleReopen}
              disabled={loading || !reason.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Reabrindo...' : 'Reabrir Parcela'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
