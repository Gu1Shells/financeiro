import { useState } from 'react';
import { X, AlertTriangle, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

interface RefundPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contribution: {
    id: string;
    amount: number;
    user_name: string;
    expense_title: string;
    installment_number: number;
  };
  onRefund: () => void;
}

export const RefundPaymentModal = ({ isOpen, onClose, contribution, onRefund }: RefundPaymentModalProps) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      showToast('Por favor, informe o motivo do estorno', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error: refundError } = await supabase
        .from('payment_refunds')
        .insert({
          contribution_id: contribution.id,
          refunded_by: user.id,
          refund_reason: reason.trim(),
          refund_amount: contribution.amount,
        });

      if (refundError) throw refundError;

      const { error: deleteError } = await supabase
        .from('payment_contributions')
        .delete()
        .eq('id', contribution.id);

      if (deleteError) throw deleteError;

      showToast('Pagamento estornado com sucesso', 'success');
      onRefund();
      onClose();
      setReason('');
    } catch (error: any) {
      console.error('Error refunding payment:', error);
      showToast(error?.message || 'Erro ao estornar pagamento', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border-2 border-red-200 dark:border-red-800">
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Estornar Pagamento</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Detalhes do Pagamento</h3>
            <div className="space-y-1 text-sm">
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Despesa:</span> {contribution.expense_title}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Parcela:</span> #{contribution.installment_number}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Usuário:</span> {contribution.user_name}
              </p>
              <p className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <span className="font-medium">Valor:</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  R$ {Number(contribution.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Motivo do Estorno *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Pagamento duplicado, valor incorreto, etc."
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              required
            />
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Esta ação irá remover o pagamento e alterar o status da parcela para pendente.</span>
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/30"
            >
              {isSubmitting ? 'Estornando...' : 'Confirmar Estorno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
