import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Users, PieChart, AlertCircle, Calendar, CreditCard, User, X } from 'lucide-react';
import { supabase, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PaymentStatusReport } from './PaymentStatusReport';

interface UserStats {
  userId: string;
  userName: string;
  totalContributed: number;
  totalExpenses: number;
  totalOwed: number;
  percentage: number;
}

interface CategoryStats {
  categoryName: string;
  categoryColor: string;
  total: number;
  count: number;
}

interface DebtDetail {
  expense_title: string;
  expense_category: string;
  installment_number: number;
  amount_owed: number;
  due_date: string;
  creditor_name: string;
  is_late: boolean;
}

export const ReportsTab = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [selectedUserDebt, setSelectedUserDebt] = useState<string | null>(null);
  const [debtDetails, setDebtDetails] = useState<DebtDetail[]>([]);

  useEffect(() => {
    loadReports();
  }, [selectedPeriod]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [profiles, contributions, expenses] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('payment_contributions').select('*, user:profiles(*)'),
        supabase.from('expenses').select('*, category:expense_categories(*)'),
      ]);

      if (profiles.data && contributions.data && expenses.data) {
        const userStatsMap: Record<string, UserStats> = {};

        profiles.data.forEach((profile: Profile) => {
          userStatsMap[profile.id] = {
            userId: profile.id,
            userName: profile.full_name,
            totalContributed: 0,
            totalExpenses: 0,
            totalOwed: 0,
            percentage: 0,
          };
        });

        contributions.data.forEach((contrib) => {
          if (userStatsMap[contrib.user_id]) {
            userStatsMap[contrib.user_id].totalContributed += Number(contrib.amount);
          }
        });

        expenses.data.forEach((expense) => {
          if (userStatsMap[expense.created_by]) {
            userStatsMap[expense.created_by].totalExpenses += Number(expense.total_amount);
          }
        });

        const totalMembers = profiles.data.length;

        for (const profile of profiles.data) {
          const { data: userPayments } = await supabase
            .from('user_payment_details')
            .select('installment_id, installment_amount, installment_status, paid_amount')
            .eq('user_id', profile.id);

          if (userPayments && userStatsMap[profile.id]) {
            const paidInstallments = userPayments.filter(p => p.installment_status === 'paid');

            const totalShouldPay = paidInstallments.reduce(
              (sum, payment) => sum + (Number(payment.installment_amount) / totalMembers),
              0
            );
            const totalAlreadyPaid = userStatsMap[profile.id].totalContributed;
            userStatsMap[profile.id].totalOwed = Math.max(0, totalShouldPay - totalAlreadyPaid);
          }
        }

        const totalContributions = Object.values(userStatsMap).reduce(
          (sum, user) => sum + user.totalContributed,
          0
        );

        Object.values(userStatsMap).forEach((user) => {
          user.percentage = totalContributions > 0 ? (user.totalContributed / totalContributions) * 100 : 0;
        });

        setUserStats(Object.values(userStatsMap).sort((a, b) => b.totalContributed - a.totalContributed));

        const categoryStatsMap: Record<string, CategoryStats> = {};
        expenses.data.forEach((expense) => {
          const catName = expense.category?.name || 'Outros';
          const catColor = expense.category?.color || '#64748b';

          if (!categoryStatsMap[catName]) {
            categoryStatsMap[catName] = {
              categoryName: catName,
              categoryColor: catColor,
              total: 0,
              count: 0,
            };
          }

          categoryStatsMap[catName].total += Number(expense.total_amount);
          categoryStatsMap[catName].count += 1;
        });

        setCategoryStats(
          Object.values(categoryStatsMap).sort((a, b) => b.total - a.total)
        );

        const monthlyMap: Record<string, number> = {};
        expenses.data.forEach((expense) => {
          const date = new Date(expense.start_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + Number(expense.total_amount);
        });

        const sortedMonthly = Object.entries(monthlyMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([month, amount]) => ({
            month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
            amount,
          }));

        setMonthlyData(sortedMonthly);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDebtDetails = async (userId: string) => {
    try {
      const { data: profiles } = await supabase.from('profiles').select('id');
      const totalMembers = profiles?.length || 1;

      const { data: paidInstallments } = await supabase
        .from('user_payment_details')
        .select('*')
        .eq('user_id', userId)
        .eq('installment_status', 'paid')
        .eq('user_payment_status', 'pending')
        .order('due_date', { ascending: true });

      if (!paidInstallments) return;

      const details: DebtDetail[] = [];

      for (const installment of paidInstallments) {
        const { data: allContributions } = await supabase
          .from('payment_contributions')
          .select('user_id, paid_at, amount, user:profiles(full_name)')
          .eq('installment_id', installment.installment_id)
          .not('paid_at', 'is', null);

        if (allContributions && allContributions.length > 0) {
          const userShare = Number(installment.installment_amount) / totalMembers;

          const otherContributors = allContributions.filter(c => c.user_id !== userId);

          if (otherContributors.length > 0) {
            details.push({
              expense_title: installment.expense_title,
              expense_category: installment.expense_category,
              installment_number: installment.installment_number,
              amount_owed: userShare,
              due_date: installment.due_date,
              creditor_name: otherContributors.map((c: any) => c.user.full_name).join(', '),
              is_late: new Date(installment.due_date) < new Date(),
            });
          }
        }
      }

      setDebtDetails(details);
      setSelectedUserDebt(userId);
      setShowDebtModal(true);
    } catch (error) {
      console.error('Error loading debt details:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  const maxMonthly = Math.max(...monthlyData.map((d) => d.amount), 1);

  return (
    <div className="space-y-6">
      <PaymentStatusReport />

      <div className="border-t-4 border-gray-200 dark:border-gray-700 my-8"></div>

      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Estatísticas Gerais</h2>

      <div className="flex gap-2">
        <button
          onClick={() => setSelectedPeriod('month')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedPeriod === 'month'
              ? 'bg-emerald-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
          }`}
        >
          Mês
        </button>
        <button
          onClick={() => setSelectedPeriod('quarter')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedPeriod === 'quarter'
              ? 'bg-emerald-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
          }`}
        >
          Trimestre
        </button>
        <button
          onClick={() => setSelectedPeriod('year')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedPeriod === 'year'
              ? 'bg-emerald-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
          }`}
        >
          Ano
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Contribuições por Sócio</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total pago por cada um</p>
            </div>
          </div>

          <div className="space-y-4">
            {userStats.map((user, index) => (
              <div key={user.userId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0
                          ? 'bg-amber-500'
                          : index === 1
                          ? 'bg-gray-400'
                          : 'bg-orange-600'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{user.userName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{user.percentage.toFixed(1)}% do total</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-gray-800 dark:text-white">
                        R$ {user.totalContributed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user.totalOwed > 0 ? (
                          <span className="text-red-600 dark:text-red-400 flex items-center gap-1 justify-end">
                            <TrendingDown className="w-4 h-4" />
                            Deve R$ {user.totalOwed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                            <TrendingUp className="w-4 h-4" />
                            Em dia
                          </span>
                        )}
                      </p>
                    </div>
                    {user.totalOwed > 0 && (
                      <button
                        onClick={() => loadDebtDetails(user.userId)}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                      >
                        Ver Detalhes
                      </button>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 h-3 rounded-full transition-all"
                    style={{ width: `${user.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-lg">
              <PieChart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Despesas por Categoria</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Distribuição dos gastos</p>
            </div>
          </div>

          <div className="space-y-3">
            {categoryStats.map((cat) => {
              const totalExpenses = categoryStats.reduce((sum, c) => sum + c.total, 0);
              const percentage = (cat.total / totalExpenses) * 100;

              return (
                <div key={cat.categoryName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: cat.categoryColor }}
                      />
                      <span className="font-medium text-gray-800 dark:text-white">{cat.categoryName}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">({cat.count})</span>
                    </div>
                    <span className="font-bold text-gray-800 dark:text-white">
                      R$ {cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: cat.categoryColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Evolução Mensal</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Últimos 6 meses</p>
          </div>
        </div>

        <div className="h-64 flex items-end justify-between gap-2">
          {monthlyData.map((data) => (
            <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center justify-end h-48">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  R$ {(data.amount / 1000).toFixed(1)}k
                </span>
                <div
                  className="w-full bg-gradient-to-t from-emerald-500 to-teal-600 rounded-t-lg transition-all hover:from-emerald-600 hover:to-teal-700"
                  style={{ height: `${(data.amount / maxMonthly) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{data.month}</span>
            </div>
          ))}
        </div>
      </div>

      {showDebtModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Detalhes da Dívida</h2>
                  <p className="text-red-100 mt-1">
                    {debtDetails.length} parcela{debtDetails.length !== 1 ? 's' : ''} pendente{debtDetails.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setShowDebtModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {debtDetails.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-700 dark:text-white">Nenhuma dívida pendente</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Você está em dia com todos os pagamentos!
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-red-800 dark:text-red-200 font-medium">Total a pagar</p>
                        <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                          R$ {debtDetails.reduce((sum, d) => sum + d.amount_owed, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {debtDetails.map((debt, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 ${
                          debt.is_late
                            ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-800 dark:text-white">
                                {debt.expense_title}
                              </h4>
                              {debt.is_late && (
                                <span className="text-xs bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 px-2 py-0.5 rounded-full font-medium">
                                  ATRASADA
                                </span>
                              )}
                              <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium border border-blue-200 dark:border-blue-700">
                                {debt.expense_category}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <CreditCard className="w-4 h-4" />
                                Parcela #{debt.installment_number}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Venc: {new Date(debt.due_date).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                Deve para: <span className="font-semibold text-gray-800 dark:text-white">{debt.creditor_name}</span>
                              </span>
                            </div>
                            {debt.is_late && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                                ⚠️ Atrasada há {Math.floor((new Date().getTime() - new Date(debt.due_date).getTime()) / (1000 * 60 * 60 * 24))} dias
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-red-600 dark:text-red-400">
                              R$ {debt.amount_owed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={() => setShowDebtModal(false)}
                className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
