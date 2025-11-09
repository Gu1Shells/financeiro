import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UserDebtSummary {
  user_id: string;
  full_name: string;
  total_installments: number;
  paid_installments: number;
  pending_installments: number;
  total_debt: number;
  total_paid: number;
}

interface InstallmentStatus {
  installment_id: string;
  expense_title: string;
  installment_number: number;
  installment_amount: number;
  due_date: string;
  status: string;
  user_id: string;
  user_name: string;
  paid_amount: number;
  user_payment_status: string;
}

export const PaymentStatusReport = () => {
  const [userSummaries, setUserSummaries] = useState<UserDebtSummary[]>([]);
  const [detailedStatus, setDetailedStatus] = useState<InstallmentStatus[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'summary' | 'details'>('summary');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, statusRes] = await Promise.all([
        supabase.from('user_debt_summary').select('*'),
        supabase.from('installment_payment_status').select('*'),
      ]);

      if (summaryRes.data) setUserSummaries(summaryRes.data);
      if (statusRes.data) setDetailedStatus(statusRes.data);
    } catch (error) {
      console.error('Error loading payment status:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStatus = selectedUser
    ? detailedStatus.filter(s => s.user_id === selectedUser)
    : detailedStatus;

  const pendingOnly = filteredStatus.filter(s => s.user_payment_status === 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Status de Pagamentos</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setView('summary')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              view === 'summary'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Resumo
          </button>
          <button
            onClick={() => setView('details')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              view === 'details'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Detalhes
          </button>
        </div>
      </div>

      {view === 'summary' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userSummaries.map((summary) => {
            const paymentRate = summary.total_installments > 0
              ? (summary.paid_installments / summary.total_installments) * 100
              : 0;

            return (
              <div
                key={summary.user_id}
                className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-5 hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">{summary.full_name}</h3>
                  {paymentRate === 100 ? (
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  ) : paymentRate > 0 ? (
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Parcelas Pagas:</span>
                    <span className="font-semibold text-emerald-600">
                      {summary.paid_installments} / {summary.total_installments}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Parcelas Pendentes:</span>
                    <span className="font-semibold text-red-600">{summary.pending_installments}</span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all"
                      style={{ width: `${paymentRate}%` }}
                    />
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Pago:</span>
                      <span className="text-sm font-bold text-emerald-600">
                        R$ {Number(summary.total_paid).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-gray-600">Dívida Pendente:</span>
                      <span className="text-sm font-bold text-red-600">
                        R$ {Number(summary.total_debt).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedUser(summary.user_id);
                      setView('details');
                    }}
                    className="w-full mt-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition"
                  >
                    Ver Detalhes
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Filtrar por membro:</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              {userSummaries.map((summary) => (
                <option key={summary.user_id} value={summary.user_id}>
                  {summary.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">
                Parcelas Pendentes {selectedUser && `- ${userSummaries.find(u => u.user_id === selectedUser)?.full_name}`}
              </h3>
              <p className="text-sm text-emerald-50 mt-1">
                {pendingOnly.length} parcela{pendingOnly.length !== 1 ? 's' : ''} pendente{pendingOnly.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="p-6">
              {pendingOnly.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-gray-700">Tudo em dia!</p>
                  <p className="text-sm text-gray-500 mt-1">Não há parcelas pendentes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingOnly.map((status, index) => {
                    const isLate = new Date(status.due_date) < new Date();

                    return (
                      <div
                        key={`${status.installment_id}-${status.user_id}-${index}`}
                        className={`p-4 rounded-lg border-2 ${
                          isLate
                            ? 'border-red-200 bg-red-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-800">{status.expense_title}</h4>
                              {isLate && (
                                <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-medium">
                                  ATRASADA
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span>Parcela #{status.installment_number}</span>
                              <span>Vencimento: {new Date(status.due_date).toLocaleDateString('pt-BR')}</span>
                              <span className="font-semibold text-gray-800">
                                {status.user_name}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">
                              R$ {Number(status.installment_amount).toFixed(2)}
                            </p>
                            {isLate && (
                              <p className="text-xs text-red-600 mt-1">
                                {Math.floor((new Date().getTime() - new Date(status.due_date).getTime()) / (1000 * 60 * 60 * 24))} dias de atraso
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
