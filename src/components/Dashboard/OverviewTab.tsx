import { useEffect, useState } from 'react';
import { Wallet, TrendingDown, AlertCircle, CheckCircle, Home, Droplet, Zap, Tv, Armchair, UtensilsCrossed, Wifi, Wrench, Tag, Calendar as CalendarIcon, Bell } from 'lucide-react';
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
  const [upcomingPayments, setUpcomingPayments] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);

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
        .in('status', ['active', 'paid'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (startDate) {
        expensesListQuery = expensesListQuery.gte('created_at', startDate);
      }
      if (endDate) {
        expensesListQuery = expensesListQuery.lte('created_at', endDate + 'T23:59:59');
      }

      const { data: expenses } = await expensesListQuery;

      const filteredExpenses = (expenses || []).filter(expense => {
        if (expense.is_fixed && expense.status === 'paid') {
          return false;
        }
        return true;
      }).slice(0, 5);

      setRecentExpenses(filteredExpenses);

      const today = new Date();
      const next7Days = new Date();
      next7Days.setDate(today.getDate() + 7);

      const { data: upcoming } = await supabase
        .from('installment_payments')
        .select('*, expense:expenses!inner(title, category:expense_categories(*))')
        .eq('status', 'pending')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', next7Days.toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(5);

      setUpcomingPayments(upcoming || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setNotificationsRead(true);
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
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <button
            onClick={handleBellClick}
            className="relative p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition shadow-md"
          >
            <Bell className={`w-6 h-6 ${!notificationsRead && upcomingPayments.length > 0 ? 'animate-bell-ring' : ''}`} />
            {upcomingPayments.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {upcomingPayments.length}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-80 z-50">
              <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                Vencimentos Próximos
              </h4>
              {upcomingPayments.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-sm text-center py-4">
                  Nenhum pagamento nos próximos 7 dias
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingPayments.map((payment) => {
                    const daysUntilDue = Math.ceil((new Date(payment.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysUntilDue <= 3;

                    return (
                      <div
                        key={payment.id}
                        className={`p-3 rounded-lg border-2 ${
                          isUrgent
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        <p className="font-semibold text-gray-800 dark:text-white text-sm">
                          {payment.expense?.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Parcela {payment.installment_number} • R$ {Number(payment.amount).toFixed(2)}
                        </p>
                        <p className={`text-xs font-bold mt-1 ${
                          isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {daysUntilDue === 0 ? 'Vence hoje!' : `Vence em ${daysUntilDue} dia${daysUntilDue > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Despesas Recentes</h3>
        <div className="space-y-3">
          {recentExpenses.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">Nenhuma despesa registrada ainda</p>
          ) : (
            recentExpenses.map((expense) => {
              const IconComponent = iconMap[expense.category?.icon || 'tag'] || Tag;
              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: expense.category?.color + '20' }}
                    >
                      <IconComponent className="w-5 h-5" style={{ color: expense.category?.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{expense.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {expense.creator?.full_name} • {expense.installments}x
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800 dark:text-white">
                      R$ {Number(expense.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{expense.category?.name}</p>
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
