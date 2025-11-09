import { useEffect, useState } from 'react';
import { Wallet, TrendingDown, AlertCircle, CheckCircle, Home, Droplet, Zap, Tv, Armchair, UtensilsCrossed, Wifi, Wrench, Tag, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatsCard } from './StatsCard';
import { useAuth } from '../../contexts/AuthContext';

const iconMap: Record<string, any> = {
  'home': Home,
  'droplet': Droplet,
  'zap': Zap,
  'tv': Tv,
  'armchair': Armchair,
  'utensils': UtensilsCrossed,
  'wifi': Wifi,
  'wrench': Wrench,
  'tag': Tag,
};

interface DashboardStats {
  totalExpenses: number;
  myContributions: number;
  pendingPayments: number;
  completedPayments: number;
}

export const OverviewTab = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalExpenses: 0,
    myContributions: 0,
    pendingPayments: 0,
    completedPayments: 0,
  });
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, [user, startDate, endDate]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      let expensesQuery = supabase.from('expenses').select('total_amount, created_at');
      let contributionsQuery = supabase
        .from('payment_contributions')
        .select('amount, paid_at')
        .eq('user_id', user.id);
      let installmentsQuery = supabase
        .from('installment_payments')
        .select('status, due_date, expense:expenses!inner(id)');

      if (startDate) {
        expensesQuery = expensesQuery.gte('created_at', startDate);
        contributionsQuery = contributionsQuery.gte('paid_at', startDate);
        installmentsQuery = installmentsQuery.gte('due_date', startDate);
      }
      if (endDate) {
        expensesQuery = expensesQuery.lte('created_at', endDate + 'T23:59:59');
        contributionsQuery = contributionsQuery.lte('paid_at', endDate + 'T23:59:59');
        installmentsQuery = installmentsQuery.lte('due_date', endDate + 'T23:59:59');
      }

      const [expensesRes, contributionsRes, installmentsRes] = await Promise.all([
        expensesQuery,
        contributionsQuery,
        installmentsQuery,
      ]);

      const totalExpenses = expensesRes.data?.reduce((sum, e) => sum + Number(e.total_amount), 0) || 0;
      const myContributions = contributionsRes.data?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const pendingPayments = installmentsRes.data?.filter((i) => i.status === 'pending').length || 0;
      const completedPayments = installmentsRes.data?.filter((i) => i.status === 'paid').length || 0;

      setStats({
        totalExpenses,
        myContributions,
        pendingPayments,
        completedPayments,
      });

      let expensesListQuery = supabase
        .from('expenses')
        .select('*, category:expense_categories(*), creator:profiles!created_by(*)')
        .order('created_at', { ascending: false })
        .limit(5);

      if (startDate) {
        expensesListQuery = expensesListQuery.gte('created_at', startDate);
      }
      if (endDate) {
        expensesListQuery = expensesListQuery.lte('created_at', endDate + 'T23:59:59');
      }

      const { data: expenses } = await expensesListQuery;
      setRecentExpenses(expenses || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
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

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-lg">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Filtrar por Período</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Despesas"
          value={`R$ ${stats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          color="blue"
        />
        <StatsCard
          title="Minhas Contribuições"
          value={`R$ ${stats.myContributions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingDown}
          color="emerald"
        />
        <StatsCard
          title="Pagamentos Pendentes"
          value={stats.pendingPayments.toString()}
          icon={AlertCircle}
          color="amber"
        />
        <StatsCard
          title="Pagamentos Completos"
          value={stats.completedPayments.toString()}
          icon={CheckCircle}
          color="emerald"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Despesas Recentes</h3>
        <div className="space-y-3">
          {recentExpenses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma despesa registrada ainda</p>
          ) : (
            recentExpenses.map((expense) => {
              const IconComponent = iconMap[expense.category?.icon || 'tag'] || Tag;
              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: expense.category?.color + '20' }}
                    >
                      <IconComponent className="w-5 h-5" style={{ color: expense.category?.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{expense.title}</p>
                      <p className="text-sm text-gray-500">
                        {expense.creator?.full_name} • {expense.installments}x
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">
                      R$ {Number(expense.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-500">{expense.category?.name}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
