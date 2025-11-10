import { useState } from 'react';
import { X, Save, Edit, AlertTriangle } from 'lucide-react';
import { supabase, InstallmentPayment } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface EditInstallmentModalProps {
  installment: InstallmentPayment;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditInstallmentModal = ({ installment, onClose, onSuccess }: EditInstallmentModalProps) => {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: Number(installment.amount).toFixed(2),
    due_date: installment.due_date,
  });

  const hasChanges =
    formData.amount !== Number(installment.amount).toFixed(2) ||
    formData.due_date !== installment.due_date;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('installment_payments')
        .update({
          amount: parseFloat(formData.amount),
          due_date: formData.due_date,
          edited_at: new Date().toISOString(),
          edited_by: user.id,
        })
        .eq('id', installment.id);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating installment:', error);
      toast.error('Erro ao atualizar parcela');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Editar Parcela #{installment.installment_number}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Valores originais serão salvos no histórico
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Atenção!</p>
              <p className="text-xs mt-1">
                Esta ação será registrada no histórico e todos os membros poderão visualizar.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor Original
            </label>
            <div className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-semibold">
              R$ {Number((installment as any).original_amount || installment.amount).toFixed(2)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Novo Valor (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Vencimento Original
            </label>
            <div className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-semibold">
              {new Date((installment as any).original_due_date || installment.due_date).toLocaleDateString('pt-BR')}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nova Data de Vencimento *
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !hasChanges}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
