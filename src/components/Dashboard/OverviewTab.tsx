import { useEffect, useState } from 'react';
import { Wallet, TrendingDown, AlertCircle, CheckCircle, Home, Droplet, Zap, Tv, Armchair, UtensilsCrossed, Wifi, Wrench, Tag } from 'lucide-react';
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

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [expensesRes, contributionsRes, installmentsRes] = await Promise.all([
        supabase.from('expenses').select('total_amount'),
        supabase
          .from('payment_contributions')
          .select('amount')
          .eq('user_id', user.id),
        supabase.from('installment_payments').select('status'),
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

      const { data: expenses } = await supabase
        .from('expenses')
        .select('*, category:expense_categories(*), creator:profiles!created_by(*)')
        .order('created_at', { ascending: false })
        .limit(5);

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
