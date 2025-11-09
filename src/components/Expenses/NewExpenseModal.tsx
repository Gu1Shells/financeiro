import { useState, useEffect } from 'react';
import { X, Save, CreditCard, Wallet, ChevronDown, ChevronUp, User, Percent, Plus } from 'lucide-react';
import { supabase, ExpenseCategory, Profile } from '../../lib/supabase';
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDownPayment, setShowDownPayment] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    color: '#10b981',
    icon: 'tag'
  });
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
    purchased_by: '',
    apply_late_fees: false,
    late_fee_percentage: '0.033',
  });

  useEffect(() => {
    loadCategories();
    loadPaymentMethods();
    loadProfiles();
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

  const loadProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (data) {
      setProfiles(data);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      alert('Por favor, insira um nome para a categoria');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert([{
          name: newCategory.name.trim(),
          color: newCategory.color,
          icon: newCategory.icon
        }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setCategories([...categories, data]);
        setFormData({ ...formData, category_id: data.id });
        setNewCategory({ name: '', color: '#10b981', icon: 'tag' });
        setShowNewCategory(false);
        alert('Categoria criada com sucesso!');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Erro ao criar categoria');
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

    if (!formData.purchased_by) {
      alert('Por favor, selecione quem realizou a compra!');
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
          purchased_by: formData.purchased_by,
          apply_late_fees: formData.apply_late_fees,
          late_fee_percentage: formData.apply_late_fees ? parseFloat(formData.late_fee_percentage) : 0,
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
              <div className="flex gap-2">
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition flex items-center gap-2"
                  title="Nova Categoria"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quem realizou a compra? *
            </label>
            <select
              value={formData.purchased_by}
              onChange={(e) => setFormData({ ...formData, purchased_by: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            >
              <option value="">Selecione...</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.full_name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Quem passou no cartão ou pagou à vista
            </p>
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

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-3"
            >
              <Percent className="w-5 h-5" />
              {showAdvanced ? 'Ocultar configurações avançadas' : 'Configurações avançadas (juros)'}
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.apply_late_fees}
                    onChange={(e) => setFormData({ ...formData, apply_late_fees: e.target.checked })}
                    className="w-5 h-5 text-amber-600 rounded focus:ring-2 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-amber-900">
                      Aplicar juros por atraso
                    </span>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Cobra juros automáticos para pagamentos atrasados
                    </p>
                  </div>
                </label>

                {formData.apply_late_fees && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Taxa de juros por dia (%)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={formData.late_fee_percentage}
                      onChange={(e) => setFormData({ ...formData, late_fee_percentage: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                    <p className="text-xs text-amber-700 mt-1">
                      Padrão: 0.033% ao dia (taxa de maquininha = ~1% ao mês)
                    </p>
                  </div>
                )}
              </div>
            )}
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

      {showNewCategory && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Nova Categoria</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex: Eletrônicos"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cor
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    className="w-16 h-12 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="#10b981"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ícone
                </label>
                <select
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="tag">Tag (Padrão)</option>
                  <option value="home">Casa</option>
                  <option value="droplet">Água</option>
                  <option value="zap">Energia</option>
                  <option value="tv">TV/Internet</option>
                  <option value="armchair">Móveis</option>
                  <option value="utensils">Alimentação</option>
                  <option value="wifi">WiFi</option>
                  <option value="wrench">Manutenção</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategory({ name: '', color: '#10b981', icon: 'tag' });
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition"
                >
                  Criar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
