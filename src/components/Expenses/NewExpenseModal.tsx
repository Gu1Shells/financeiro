import { useState, useEffect } from 'react';
import { X, Save, CreditCard, Banknote, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase, ExpenseCategory } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface NewExpenseModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  is_credit: boolean;
  is_active: boolean;
}

export const NewExpenseModal = ({ onClose, onSuccess }: NewExpenseModalProps) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDownPayment, setShowDownPayment] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    total_amount: '',
    category_id: '',
    installments: '1',
    is_fixed: false,
    priority: 'media' as 'baixa' | 'media' | 'alta' | 'urgente',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
    down_payment_amount: '0',
    down_payment_method_id: '',
    down_payment_installments: '1',
    remaining_payment_method_id: '',
  });

  useEffect(() => {
    loadCategories();
    loadPaymentMethods();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name');

    if (data) {
      setCategories(data);
      if (data.length > 0) {
        setFormData((prev) => ({ ...prev, category_id: data[0].id }));
      }
    }
  };

  const loadPaymentMethods = async () => {
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data) {
      setPaymentMethods(data);
      if (data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          down_payment_method_id: data[0].id,
          remaining_payment_method_id: data[0].id
        }));
      }
    }
  };

  const totalAmount = parseFloat(formData.total_amount) || 0;
  const downPaymentAmount = parseFloat(formData.down_payment_amount) || 0;
  const remainingAmount = totalAmount - downPaymentAmount;
  const downPaymentInstallments = parseInt(formData.down_payment_installments) || 1;
  const remainingInstallments = parseInt(formData.installments) || 1;
  const downPaymentPerInstallment = downPaymentAmount > 0 ? downPaymentAmount / downPaymentInstallments : 0;
  const remainingPerInstallment = remainingAmount > 0 ? remainingAmount / remainingInstallments : 0;
  const totalInstallments = (downPaymentAmount > 0 ? downPaymentInstallments : 0) + remainingInstallments;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (downPaymentAmount > totalAmount) {
      alert('O valor da entrada não pode ser maior que o valor total!');
      return;
    }

    if (downPaymentAmount < 0) {
      alert('O valor da entrada não pode ser negativo!');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('expenses').insert([
        {
          title: formData.title,
          total_amount: totalAmount,
          category_id: formData.category_id,
          created_by: user.id,
          installments: remainingInstallments,
          is_fixed: formData.is_fixed,
          priority: formData.priority,
          start_date: formData.start_date,
          notes: formData.notes || null,
          down_payment_amount: downPaymentAmount,
          down_payment_method_id: downPaymentAmount > 0 ? formData.down_payment_method_id : null,
          down_payment_installments: downPaymentAmount > 0 ? downPaymentInstallments : 0,
          remaining_payment_method_id: formData.remaining_payment_method_id,
        },
      ]);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Erro ao criar despesa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-800">Nova Despesa</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título da Despesa *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Ex: Ar Condicionado"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Total (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="6000.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowDownPayment(!showDownPayment)}
              className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-3"
            >
              <Wallet className="w-5 h-5" />
              {showDownPayment ? 'Ocultar entrada' : 'Adicionar entrada'}
              {showDownPayment ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDownPayment && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor da Entrada (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={formData.total_amount}
                      value={formData.down_payment_amount}
                      onChange={(e) => setFormData({ ...formData, down_payment_amount: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="2000.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Forma de Pagamento da Entrada
                    </label>
                    <select
                      value={formData.down_payment_method_id}
                      onChange={(e) => setFormData({ ...formData, down_payment_method_id: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {paymentMethods.map((method) => (
                        <option key={method.id} value={method.id}>
                          {method.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parcelas da Entrada
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.down_payment_installments}
                    onChange={(e) => setFormData({ ...formData, down_payment_installments: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <p className="text-xs text-emerald-700 mt-1">
                    {downPaymentAmount > 0
                      ? `${downPaymentInstallments}x de R$ ${downPaymentPerInstallment.toFixed(2)}`
                      : 'Informe o valor da entrada'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Forma de Pagamento do Restante *
              </label>
              <select
                value={formData.remaining_payment_method_id}
                onChange={(e) => setFormData({ ...formData, remaining_payment_method_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              >
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parcelas do Restante *
              </label>
              <input
                type="number"
                min="1"
                value={formData.installments}
                onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {remainingInstallments}x de R$ {remainingPerInstallment.toFixed(2)}
              </p>
            </div>
          </div>

          {totalAmount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Resumo do Parcelamento
              </h3>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="flex justify-between">
                  <span>Valor Total:</span>
                  <span className="font-semibold">R$ {totalAmount.toFixed(2)}</span>
                </div>
                {downPaymentAmount > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>Entrada ({downPaymentInstallments}x):</span>
                      <span className="font-semibold">R$ {downPaymentAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Restante ({remainingInstallments}x):</span>
                      <span className="font-semibold">R$ {remainingAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between pt-2 border-t border-blue-300">
                  <span className="font-semibold">Total de Parcelas:</span>
                  <span className="font-bold">{totalInstallments}x</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Início *
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioridade *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, priority: 'baixa' })}
                className={`p-3 rounded-lg border-2 transition font-medium ${
                  formData.priority === 'baixa'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                Baixa
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, priority: 'media' })}
                className={`p-3 rounded-lg border-2 transition font-medium ${
                  formData.priority === 'media'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                Média
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, priority: 'alta' })}
                className={`p-3 rounded-lg border-2 transition font-medium ${
                  formData.priority === 'alta'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                Alta
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, priority: 'urgente' })}
                className={`p-3 rounded-lg border-2 transition font-medium ${
                  formData.priority === 'urgente'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                Urgente
              </button>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_fixed}
                onChange={(e) => setFormData({ ...formData, is_fixed: e.target.checked })}
                className="w-5 h-5 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Despesa fixa mensal (ex: aluguel, água, luz)
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              rows={3}
              placeholder="Detalhes adicionais sobre a despesa..."
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
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Salvando...' : 'Salvar Despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
