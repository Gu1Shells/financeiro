import { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, CheckCircle, AlertCircle, Users, Trash2, CreditCard, Wallet } from 'lucide-react';
import { supabase, Expense, InstallmentPayment, PaymentContribution, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DeleteExpenseModal } from './DeleteExpenseModal';

interface ExpenseDetailsModalProps {
  expense: Expense;
  onClose: () => void;
  onUpdate: () => void;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
}

export const ExpenseDetailsModal = ({ expense, onClose, onUpdate }: ExpenseDetailsModalProps) => {
  const { user } = useAuth();
  const [installments, setInstallments] = useState<InstallmentPayment[]>([]);
  const [contributions, setContributions] = useState<Record<string, PaymentContribution[]>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{
    show: boolean;
    installment?: InstallmentPayment;
  }>({ show: false });

  useEffect(() => {
    loadData();
  }, [expense.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [installmentsRes, contributionsRes, profilesRes, methodsRes] = await Promise.all([
        supabase
          .from('installment_payments')
          .select('*')
          .eq('expense_id', expense.id)
          .order('installment_number'),
        supabase
          .from('payment_contributions')
          .select('*, user:profiles(*)')
          .in(
            'installment_id',
            (
              await supabase
                .from('installment_payments')
                .select('id')
                .eq('expense_id', expense.id)
            ).data?.map((i) => i.id) || []
          ),
        supabase.from('profiles').select('*'),
        supabase.from('payment_methods').select('id, name, icon').eq('is_active', true),
      ]);

      setInstallments(installmentsRes.data || []);
      setProfiles(profilesRes.data || []);
      setPaymentMethods(methodsRes.data || []);

      const contribsByInstallment: Record<string, PaymentContribution[]> = {};
      (contributionsRes.data || []).forEach((contrib) => {
        if (!contribsByInstallment[contrib.installment_id]) {
          contribsByInstallment[contrib.installment_id] = [];
        }
        contribsByInstallment[contrib.installment_id].push(contrib);
      });
      setContributions(contribsByInstallment);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = (installment: InstallmentPayment) => {
    setPaymentModal({ show: true, installment });
  };

  const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
    partial: { label: 'Parcial', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
    paid: { label: 'Pago', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{expense.title}</h2>
              <p className="text-sm text-gray-500">
                Criado por {expense.creator?.full_name} em{' '}
                {new Date(expense.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {user?.id === expense.created_by && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 hover:bg-red-50 rounded-lg transition text-red-600"
                  title="Excluir despesa"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Valor Total</p>
                <p className="text-2xl font-bold text-gray-800">
                  R$ {Number(expense.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Parcelas</p>
                <p className="text-2xl font-bold text-gray-800">{expense.installments}x</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Valor/Parcela</p>
                <p className="text-2xl font-bold text-gray-800">
                  R${' '}
                  {(Number(expense.total_amount) / expense.installments).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            {(expense as any).down_payment_amount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Informações de Pagamento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700 font-medium mb-1">Entrada</p>
                    <p className="text-blue-900 font-semibold">
                      R$ {Number((expense as any).down_payment_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-blue-600 text-xs mt-1">
                      {(expense as any).down_payment_installments}x de R${' '}
                      {(Number((expense as any).down_payment_amount) / (expense as any).down_payment_installments).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium mb-1">Restante</p>
                    <p className="text-blue-900 font-semibold">
                      R$ {(Number(expense.total_amount) - Number((expense as any).down_payment_amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-blue-600 text-xs mt-1">
                      {expense.installments}x de R${' '}
                      {((Number(expense.total_amount) - Number((expense as any).down_payment_amount)) / expense.installments).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-gray-800">Parcelas</h3>
                {installments.map((installment) => {
                  const installmentContribs = contributions[installment.id] || [];
                  const totalPaid = installmentContribs.reduce((sum, c) => sum + Number(c.amount), 0);
                  const config = statusConfig[installment.status];
                  const Icon = config.icon;

                  const paymentMethod = paymentMethods.find(m => m.id === (installment as any).payment_method_id);
                  const isDownPayment = (installment as any).is_down_payment;

                  return (
                    <div
                      key={installment.id}
                      className={`rounded-xl p-4 border-2 transition ${
                        isDownPayment
                          ? 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                          : 'bg-gray-50 border-gray-200 hover:border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`bg-white w-10 h-10 rounded-lg flex items-center justify-center font-bold border-2 ${
                            isDownPayment ? 'text-emerald-600 border-emerald-300' : 'text-blue-600 border-blue-200'
                          }`}>
                            {installment.installment_number}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 flex items-center gap-2">
                              {isDownPayment && <Wallet className="w-4 h-4 text-emerald-600" />}
                              Parcela {installment.installment_number}
                              {isDownPayment && <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">Entrada</span>}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(installment.due_date).toLocaleDateString('pt-BR')}
                              </span>
                              {paymentMethod && (
                                <span className="flex items-center gap-1">
                                  <CreditCard className="w-4 h-4" />
                                  {paymentMethod.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color} flex items-center gap-1`}>
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </span>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Progresso</span>
                          <span className="font-semibold text-gray-800">
                            R$ {totalPaid.toFixed(2)} / R$ {Number(installment.amount).toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((totalPaid / Number(installment.amount)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {installmentContribs.length > 0 && (
                        <div className="mb-3 space-y-2">
                          <p className="text-sm font-medium text-gray-700">Contribuições:</p>
                          {installmentContribs.map((contrib) => (
                            <div
                              key={contrib.id}
                              className="flex items-center justify-between bg-white p-2 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm font-medium text-gray-700">
                                  {contrib.user?.full_name}
                                </span>
                              </div>
                              <span className="text-sm font-semibold text-gray-800">
                                R$ {Number(contrib.amount).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {installment.status !== 'paid' && (
                        <button
                          onClick={() => handleAddPayment(installment)}
                          className="w-full mt-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition flex items-center justify-center gap-2"
                        >
                          <DollarSign className="w-4 h-4" />
                          Registrar Pagamento
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {paymentModal.show && paymentModal.installment && (
        <PaymentModal
          installment={paymentModal.installment}
          profiles={profiles}
          onClose={() => setPaymentModal({ show: false })}
          onSuccess={() => {
            loadData();
            onUpdate();
            setPaymentModal({ show: false });
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteExpenseModal
          expense={expense}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={() => {
            onUpdate();
            onClose();
          }}
        />
      )}
    </>
  );
};

interface PaymentModalProps {
  installment: InstallmentPayment;
  profiles: Profile[];
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal = ({ installment, profiles, onClose, onSuccess }: PaymentModalProps) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [selectedUser, setSelectedUser] = useState(user?.id || '');
  const [payForAll, setPayForAll] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const numProfiles = profiles.length;
  const amountPerPerson = numProfiles > 0 ? Number(installment.amount) / numProfiles : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (payForAll) {
        const contributions = profiles.map(profile => ({
          installment_id: installment.id,
          user_id: profile.id,
          amount: amountPerPerson,
          notes: notes || 'Pagamento dividido entre todos',
        }));

        const { error } = await supabase.from('payment_contributions').insert(contributions);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('payment_contributions').insert([
          {
            installment_id: installment.id,
            user_id: selectedUser,
            amount: parseFloat(amount),
            notes: notes || null,
          },
        ]);
        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Erro ao registrar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">Registrar Pagamento</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={payForAll}
                onChange={(e) => {
                  setPayForAll(e.target.checked);
                  if (e.target.checked) {
                    setAmount(String(amountPerPerson.toFixed(2)));
                  }
                }}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-blue-900">
                  Todos pagaram juntos
                </span>
                <p className="text-xs text-blue-700 mt-0.5">
                  Registra pagamento de R$ {amountPerPerson.toFixed(2)} para cada um dos {numProfiles} membros
                </p>
              </div>
            </label>
          </div>

          {!payForAll && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quem pagou?</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!payForAll && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={Number(installment.amount)}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Valor da parcela: R$ {Number(installment.amount).toFixed(2)}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Sugestão (dividido): R$ {amountPerPerson.toFixed(2)}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              rows={2}
              placeholder="Opcional..."
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
              className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
