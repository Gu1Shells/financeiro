import { useEffect, useState } from 'react';
import { Calendar, User, Package, Home, Droplet, Zap, Tv, Armchair, UtensilsCrossed, Wifi, Wrench, Tag, AlertCircle } from 'lucide-react';
import { supabase, Expense } from '../../lib/supabase';

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

interface ExpensesTabProps {
  onExpenseClick: (expense: Expense) => void;
}

export const ExpensesTab = ({ onExpenseClick }: ExpensesTabProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'fixed' | 'installment'>('all');

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, category:expense_categories(*), creator:profiles!created_by(*)')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = expenses.filter((expense) => {
    if (filter === 'all') return true;
    if (filter === 'fixed') return expense.is_fixed;
    if (filter === 'installment') return !expense.is_fixed;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'all'
              ? 'bg-emerald-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('fixed')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'fixed'
              ? 'bg-emerald-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
          }`}
        >
          Fixas
        </button>
        <button
          onClick={() => setFilter('installment')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'installment'
              ? 'bg-emerald-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
          }`}
        >
          Parceladas
        </button>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Nenhuma despesa encontrada</h3>
          <p className="text-gray-600 dark:text-gray-400">Clique em "Nova Despesa" para adicionar uma</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExpenses.map((expense) => {
            const IconComponent = iconMap[expense.category?.icon || 'tag'] || Tag;
            const priorityConfig = {
              baixa: { label: 'Baixa', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' },
              media: { label: 'Média', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300 dark:border-blue-700' },
              alta: { label: 'Alta', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 dark:border-amber-700' },
              urgente: { label: 'Urgente', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700' },
            };
            const priority = priorityConfig[expense.priority || 'media'];

            return (
              <div
                key={expense.id}
                onClick={() => onExpenseClick(expense)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-600 transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: expense.category?.color + '20' }}
                  >
                    <IconComponent className="w-6 h-6" style={{ color: expense.category?.color }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded border ${priority.color}`}>
                      {priority.label}
                    </span>
                    {expense.is_fixed && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold rounded border border-blue-300 dark:border-blue-700">
                        Fixa
                      </span>
                    )}
                  </div>
                </div>

              <h3 className="font-bold text-gray-800 dark:text-white mb-2 text-lg">{expense.title}</h3>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Package className="w-4 h-4" />
                  <span>{expense.category?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4" />
                  <span>{expense.creator?.full_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(expense.start_date).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Valor Total</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">
                    R$ {Number(expense.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Parcelas</p>
                  <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{expense.installments}x</p>
                </div>
              </div>

              {expense.notes && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-2">{expense.notes}</p>
              )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
