import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Users, PieChart } from 'lucide-react';
import { supabase, Profile } from '../../lib/supabase';
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

export const ReportsTab = () => {
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');

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

      <div className="border-t-4 border-gray-200 my-8"></div>

      <h2 className="text-2xl font-bold text-gray-800 mb-4">Estatísticas Gerais</h2>

      <div className="flex gap-2">
        <button
          onClick={() => setSelectedPeriod('month')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedPeriod === 'month'
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Mês
        </button>
        <button
          onClick={() => setSelectedPeriod('quarter')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedPeriod === 'quarter'
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Trimestre
        </button>
        <button
          onClick={() => setSelectedPeriod('year')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            selectedPeriod === 'year'
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Ano
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Contribuições por Sócio</h3>
              <p className="text-sm text-gray-500">Total pago por cada um</p>
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
                      <p className="font-semibold text-gray-800">{user.userName}</p>
                      <p className="text-sm text-gray-500">{user.percentage.toFixed(1)}% do total</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">
                      R$ {user.totalContributed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user.totalExpenses > user.totalContributed ? (
                        <span className="text-red-600 flex items-center gap-1 justify-end">
                          <TrendingDown className="w-4 h-4" />
                          Deve
                        </span>
                      ) : (
                        <span className="text-emerald-600 flex items-center gap-1 justify-end">
                          <TrendingUp className="w-4 h-4" />
                          Ajudou
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 h-3 rounded-full transition-all"
                    style={{ width: `${user.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-lg">
              <PieChart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Despesas por Categoria</h3>
              <p className="text-sm text-gray-500">Distribuição dos gastos</p>
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
                      <span className="font-medium text-gray-800">{cat.categoryName}</span>
                      <span className="text-sm text-gray-500">({cat.count})</span>
                    </div>
                    <span className="font-bold text-gray-800">
                      R$ {cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Evolução Mensal</h3>
            <p className="text-sm text-gray-500">Últimos 6 meses</p>
          </div>
        </div>

        <div className="h-64 flex items-end justify-between gap-2">
          {monthlyData.map((data) => (
            <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center justify-end h-48">
                <span className="text-sm font-semibold text-gray-700 mb-2">
                  R$ {(data.amount / 1000).toFixed(1)}k
                </span>
                <div
                  className="w-full bg-gradient-to-t from-emerald-500 to-teal-600 rounded-t-lg transition-all hover:from-emerald-600 hover:to-teal-700"
                  style={{ height: `${(data.amount / maxMonthly) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600">{data.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
