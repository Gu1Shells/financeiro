import { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { supabase, Expense } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DeleteExpenseModalProps {
  expense: Expense;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeleteExpenseModal = ({ expense, onClose, onSuccess }: DeleteExpenseModalProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!user || !reason.trim()) {
      setError('Por favor, informe o motivo da exclusão');
      return;
    }

    if (reason.trim().length < 10) {
      setError('O motivo deve ter pelo menos 10 caracteres');
      return;
    }

    if (expense.created_by !== user.id && reason.trim().length < 20) {
      setError('Ao excluir despesa de outro sócio, o motivo deve ter pelo menos 20 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: deleteError } = await supabase.rpc('soft_delete_expense', {
        expense_id_param: expense.id,
        user_id_param: user.id,
        reason_param: reason.trim(),
      });

      if (deleteError) throw deleteError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      setError(err.message || 'Erro ao excluir despesa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 p-2 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Excluir Despesa</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Atenção:</strong> Esta ação não pode ser desfeita. A despesa será removida do
              sistema, mas ficará registrada no histórico de exclusões para consulta futura.
            </p>
          </div>

          {expense.created_by !== user?.id && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Aviso:</strong> Você está excluindo uma despesa criada por outro sócio.
                Por favor, forneça um motivo detalhado (mínimo 20 caracteres).
              </p>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Despesa a ser excluída:</h4>
            <p className="text-gray-700 dark:text-gray-300">{expense.title}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Valor: R$ {Number(expense.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Motivo da exclusão *
              <span className="text-xs text-gray-500">
                ({expense.created_by !== user?.id ? 'Mínimo 20' : 'Mínimo 10'} caracteres)
              </span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={4}
              placeholder="Explique por que esta despesa está sendo excluída..."
              required
            />
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
            )}
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
              onClick={handleDelete}
              disabled={loading || !reason.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-5 h-5" />
              {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
