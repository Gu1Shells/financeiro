import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Users, PieChart, AlertCircle, Calendar, CreditCard } from 'lucide-react';
import { supabase, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PaymentStatusReport } from './PaymentStatusReport';

interface UserStats {
  userId: string;
  userName: string;
  totalContributed: number;
  totalExpenses: number;
  percentage: number;
}

interface CategoryStats {
  categoryName: string;
  categoryColor: string;
  total: number;
  count: number;
}

interface MyDebt {
  expense_id: string;
  expense_title: string;
  expense_category: string;
  installment_id: string;
  installment_number: number;
  installment_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  is_late: boolean;
}

export const ReportsTab = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; amount: number }[]>([]);
  const [myDebts, setMyDebts] = useState<MyDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    loadReports();
  }, [selectedPeriod]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [profiles, contributions, expenses, myDebtsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('payment_contributions').select('*, user:profiles(*)'),
        supabase.from('expenses').select('*, category:expense_categories(*)'),
        user ? supabase
          .from('user_payment_details')
          .select('*')
          .eq('user_id', user.id)
          .eq('user_payment_status', 'pending')
          .order('due_date', { ascending: true }) : Promise.resolve({ data: [] }),
      ]);

      if (profiles.data && contributions.data && expenses.data) {
        const userStatsMap: Record<string, UserStats> = {};

        profiles.data.forEach((profile: Profile) => {
          userStatsMap[profile.id] = {
            userId: profile.id,
            userName: profile.full_name,
            totalContributed: 0,
            totalExpenses: 0,
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

      if (myDebtsRes.data) {
        const debts: MyDebt[] = myDebtsRes.data.map((debt: any) => ({
          expense_id: debt.expense_id,
          expense_title: debt.expense_title,
          expense_category: debt.expense_category,
          installment_id: debt.installment_id,
          installment_number: debt.installment_number,
          installment_amount: Number(debt.installment_amount),
          paid_amount: Number(debt.paid_amount),
          remaining_amount: Number(debt.installment_amount) - Number(debt.paid_amount),
          due_date: debt.due_date,
          is_late: new Date(debt.due_date) < new Date(),
        }));
        setMyDebts(debts);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
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

      {myDebts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Minhas Dívidas</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {myDebts.length} parcela{myDebts.length !== 1 ? 's' : ''} pendente{myDebts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total a pagar</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                R$ {myDebts.reduce((sum, d) => sum + d.remaining_amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {myDebts.slice(0, 5).map((debt) => (
              <div
                key={debt.installment_id}
                className={`p-4 rounded-lg border-2 ${
                  debt.is_late
                    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-800 dark:text-white">{debt.expense_title}</h4>
                      {debt.is_late && (
                        <span className="text-xs bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 px-2 py-0.5 rounded-full font-medium">
                          ATRASADA
                        </span>
                      )}
                      <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium border border-blue-200 dark:border-blue-700">
                        {debt.expense_category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-4 h-4" />
                        Parcela #{debt.installment_number}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Venc: {new Date(debt.due_date).toLocaleDateString('pt-BR')}
                      </span>
                      {debt.is_late && (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          {Math.floor((new Date().getTime() - new Date(debt.due_date).getTime()) / (1000 * 60 * 60 * 24))} dias
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      R$ {debt.remaining_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      de R$ {debt.installment_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {myDebts.length > 5 && (
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 pt-2">
                + {myDebts.length - 5} parcela{myDebts.length - 5 !== 1 ? 's' : ''} adicional{myDebts.length - 5 !== 1 ? 'is' : ''}
              </p>
            )}
          </div>
        </div>
      )}

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
                  <div className="text-right">
                    <p className="font-bold text-gray-800 dark:text-white">
                      R$ {user.totalContributed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user.totalExpenses > user.totalContributed ? (
                        <span className="text-red-600 dark:text-red-400 flex items-center gap-1 justify-end">
                          <TrendingDown className="w-4 h-4" />
                          Deve
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                          <TrendingUp className="w-4 h-4" />
                          Ajudou
                        </span>
                      )}
                    </p>
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
    </div>
  );
};
