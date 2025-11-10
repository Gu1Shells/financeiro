import { useState, useEffect } from 'react';
import { Calendar, DollarSign, CheckCircle2, Filter, Layers, CreditCard } from 'lucide-react';
import { supabase, Expense, InstallmentPayment } from '../../lib/supabase';

export const PaidExpensesTab = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paidInstallments, setPaidInstallments] = useState<(InstallmentPayment & { expense?: Expense })[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'expenses' | 'installments'>('expenses');

  useEffect(() => {
    loadPaidExpenses();
  }, []);

  const loadPaidExpenses = async () => {
    setLoading(true);
    try {
      const [expensesRes, installmentsRes] = await Promise.all([
        supabase
          .from('expenses')
          .select(`
            *,
            category:expense_categories(*),
            creator:profiles!expenses_created_by_fkey(*)
          `)
          .eq('status', 'paid')
          .is('deleted_at', null)
          .order('updated_at', { ascending: false }),
        supabase
          .from('installment_payments')
          .select(`
            *,
            expense:expenses!inner(
              *,
              category:expense_categories(*),
              creator:profiles!expenses_created_by_fkey(*)
            )
          `)
          .eq('status', 'paid')
          .is('expense.deleted_at', null)
          .order('created_at', { ascending: false })
      ]);

      if (expensesRes.error) throw expensesRes.error;
      if (installmentsRes.error) throw installmentsRes.error;

      setExpenses(expensesRes.data || []);
      setPaidInstallments(installmentsRes.data || []);
    } catch (error) {
      console.error('Error loading paid expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = expenses.filter((expense) => {
    if (!startDate && !endDate) return true;

    const expenseDate = new Date(expense.updated_at);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && expenseDate < start) return false;
    if (end && expenseDate > end) return false;

    return true;
  });

  const filteredInstallments = paidInstallments.filter((installment) => {
    if (!installment.expense || (installment.expense as any).deleted_at) return false;
    if (!startDate && !endDate) return true;

    const installmentDate = new Date(installment.created_at);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && installmentDate < start) return false;
    if (end && installmentDate > end) return false;

    return true;
  });

  const totalPaid = viewMode === 'expenses'
    ? filteredExpenses.reduce((sum, exp) => sum + Number(exp.total_amount), 0)
    : filteredInstallments.reduce((sum, inst) => sum + Number(inst.amount), 0);

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
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Despesas Pagas</h2>
          <p className="text-gray-600 dark:text-gray-400">Histórico de despesas completamente quitadas</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-lg">
              <Filter className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Filtros</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('expenses')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                viewMode === 'expenses'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Layers className="w-4 h-4" />
              Despesas Completas
            </button>
            <button
              onClick={() => setViewMode('installments')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                viewMode === 'installments'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Parcelas Pagas
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Total Pago no Período
            </label>
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {startDate || endDate ? (
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Limpar filtros
          </button>
        ) : null}
      </div>

      {viewMode === 'expenses' && filteredExpenses.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <CheckCircle2 className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Nenhuma despesa paga encontrada
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {startDate || endDate
              ? 'Tente ajustar o período do filtro'
              : 'As despesas completamente quitadas aparecerão aqui'}
          </p>
        </div>
      ) : viewMode === 'installments' && filteredInstallments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <CheckCircle2 className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Nenhuma parcela paga encontrada
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {startDate || endDate
              ? 'Tente ajustar o período do filtro'
              : 'As parcelas quitadas aparecerão aqui'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {viewMode === 'expenses' ? filteredExpenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                      {expense.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Pago em {new Date(expense.updated_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    R$ {(Number(expense.total_amount) / 100).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {expense.installments}x parcelas
                  </p>
                </div>
              </div>

              {expense.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{expense.notes}</p>
                </div>
              )}

              {expense.is_recurring && (
                <div className="mt-4 flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                  <Calendar className="w-4 h-4" />
                  <span>Despesa recorrente - Dia {expense.recurrence_day} de cada mês</span>
                </div>
              )}
            </div>
          )) : filteredInstallments.map((installment) => (
            <div
              key={installment.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                      {installment.expense?.title || 'Despesa'} - Parcela #{installment.installment_number}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Pago em {new Date(installment.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    R$ {Number(installment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Vencimento: {new Date(installment.due_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
