import { useEffect, useState } from 'react';
import { Users, TrendingUp, CreditCard, DollarSign, AlertCircle, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { supabase, Profile } from '../../lib/supabase';

interface PendingDebt {
  expense_title: string;
  installment_number: number;
  amount_due: number;
  due_date: string;
  expense_id: string;
}

interface MemberDetails extends Profile {
  expenseCount: number;
  totalExpenses: number;
  totalContributions: number;
  balance: number;
  pendingDebts: PendingDebt[];
  totalPendingAmount: number;
}

export const MembersTab = () => {
  const [members, setMembers] = useState<MemberDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [showDebtsOnly, setShowDebtsOnly] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const [profilesRes, expensesRes, contributionsRes, installmentsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('expenses').select('created_by, total_amount').is('deleted_at', null),
        supabase.from('payment_contributions').select('user_id, amount, installment_id'),
        supabase
          .from('installment_payments')
          .select('id, installment_number, amount, due_date, expense_id, expense:expenses!inner(title, id, deleted_at)')
          .eq('status', 'pending')
          .is('expense.deleted_at', null),
      ]);

      if (profilesRes.data) {
        const membersData: MemberDetails[] = await Promise.all(
          profilesRes.data.map(async (profile) => {
            const userExpenses = expensesRes.data?.filter((e) => e.created_by === profile.id) || [];
            const userContributions = contributionsRes.data?.filter((c) => c.user_id === profile.id) || [];

            const { data: validInstallments } = await supabase
              .from('installment_payments')
              .select('id');

            const validInstallmentIds = new Set(validInstallments?.map(i => i.id) || []);
            const validContributions = userContributions.filter(c => validInstallmentIds.has(c.installment_id));

            const totalExpenses = userExpenses.reduce((sum, e) => sum + Number(e.total_amount), 0);
            const totalContributions = validContributions.reduce((sum, c) => sum + Number(c.amount), 0);

            const { data: userPaidInstallments } = await supabase
              .from('payment_contributions')
              .select('installment_id')
              .eq('user_id', profile.id);

            const paidIds = new Set(userPaidInstallments?.map((p) => p.installment_id) || []);

            const pendingDebts: PendingDebt[] =
              installmentsRes.data
                ?.filter((inst) => !paidIds.has(inst.id))
                .map((inst) => ({
                  expense_title: inst.expense?.title || 'Despesa',
                  installment_number: inst.installment_number,
                  amount_due: Number(inst.amount),
                  due_date: inst.due_date,
                  expense_id: inst.expense_id,
                })) || [];

            const totalPendingAmount = pendingDebts.reduce((sum, d) => sum + d.amount_due, 0);

            return {
              ...profile,
              expenseCount: userExpenses.length,
              totalExpenses,
              totalContributions,
              balance: totalContributions - totalExpenses,
              pendingDebts,
              totalPendingAmount,
            };
          })
        );

        setMembers(membersData.sort((a, b) => b.totalContributions - a.totalContributions));
      }
    } catch (error) {
      console.error('Error loading members:', error);
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

  const filteredMembers = showDebtsOnly
    ? members.filter((m) => m.pendingDebts.length > 0)
    : members;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-emerald-100 dark:border-emerald-800">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Sócios Ativos</h3>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{members.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Pessoas gerenciando as finanças</p>
        </div>

        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">Filtros</h3>
          <button
            onClick={() => setShowDebtsOnly(!showDebtsOnly)}
            className={`w-full px-4 py-2 rounded-lg font-medium transition ${
              showDebtsOnly
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {showDebtsOnly ? 'Mostrando: Com Débitos' : 'Mostrar: Todos os Sócios'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member, index) => (
          <div
            key={member.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-600 transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {member.profile_photo_url ? (
                  <img
                    src={member.profile_photo_url}
                    alt={member.full_name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-xl ${
                      index === 0
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                        : index === 1
                        ? 'bg-gradient-to-br from-gray-300 to-gray-500'
                        : 'bg-gradient-to-br from-orange-500 to-orange-700'
                    }`}
                  >
                    {member.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white text-lg">{member.full_name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {index === 0 ? 'Maior Contribuinte' : 'Sócio'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Contribuições</span>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  R$ {member.totalContributions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Despesas</span>
                </div>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  R$ {member.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Despesas Criadas</span>
                </div>
                <span className="font-bold text-gray-800 dark:text-white">{member.expenseCount}</span>
              </div>

              <div
                className={`p-4 rounded-lg border-2 ${
                  member.balance >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                }`}
              >
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Balanço</p>
                <p
                  className={`text-2xl font-bold ${
                    member.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {member.balance >= 0 ? '+' : ''}R${' '}
                  {Math.abs(member.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {member.balance >= 0 ? 'Ajudou mais do que gastou' : 'Gastou mais do que ajudou'}
                </p>
              </div>

              {member.pendingDebts.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                    className="w-full flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                        {member.pendingDebts.length} Débito{member.pendingDebts.length > 1 ? 's' : ''} Pendente
                        {member.pendingDebts.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {expandedMember === member.id ? (
                      <ChevronUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    )}
                  </button>

                  {expandedMember === member.id && (
                    <div className="mt-3 space-y-2">
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-700">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total a Pagar</p>
                        <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                          R$ {member.totalPendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      {member.pendingDebts.slice(0, 5).map((debt, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-gray-750 p-3 rounded-lg border border-gray-200 dark:border-gray-600"
                        >
                          <p className="text-sm font-semibold text-gray-800 dark:text-white mb-1">
                            {debt.expense_title}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                            <span>Parcela #{debt.installment_number}</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              R$ {debt.amount_due.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span>Vence: {new Date(debt.due_date).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      ))}
                      {member.pendingDebts.length > 5 && (
                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-2">
                          + {member.pendingDebts.length - 5} débito{member.pendingDebts.length - 5 > 1 ? 's' : ''}{' '}
                          não exibido{member.pendingDebts.length - 5 > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
