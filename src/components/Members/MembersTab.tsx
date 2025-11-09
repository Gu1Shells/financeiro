import { useEffect, useState } from 'react';
import { Users, TrendingUp, CreditCard, DollarSign } from 'lucide-react';
import { supabase, Profile } from '../../lib/supabase';

interface MemberDetails extends Profile {
  expenseCount: number;
  totalExpenses: number;
  totalContributions: number;
  balance: number;
}

export const MembersTab = () => {
  const [members, setMembers] = useState<MemberDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const [profilesRes, expensesRes, contributionsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('expenses').select('created_by, total_amount'),
        supabase.from('payment_contributions').select('user_id, amount'),
      ]);

      if (profilesRes.data) {
        const membersData: MemberDetails[] = profilesRes.data.map((profile) => {
          const userExpenses = expensesRes.data?.filter((e) => e.created_by === profile.id) || [];
          const userContributions = contributionsRes.data?.filter((c) => c.user_id === profile.id) || [];

          const totalExpenses = userExpenses.reduce((sum, e) => sum + Number(e.total_amount), 0);
          const totalContributions = userContributions.reduce((sum, c) => sum + Number(c.amount), 0);

          return {
            ...profile,
            expenseCount: userExpenses.length,
            totalExpenses,
            totalContributions,
            balance: totalContributions - totalExpenses,
          };
        });

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

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6 text-emerald-600" />
          <h3 className="text-lg font-bold text-gray-800">Sócios Ativos</h3>
        </div>
        <p className="text-3xl font-bold text-emerald-600">{members.length}</p>
        <p className="text-sm text-gray-600 mt-1">Pessoas gerenciando as finanças</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member, index) => (
          <div
            key={member.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-emerald-200 transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {member.profile_photo_url ? (
                  <img
                    src={member.profile_photo_url}
                    alt={member.full_name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
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
                  <h3 className="font-bold text-gray-800 text-lg">{member.full_name}</h3>
                  <p className="text-sm text-gray-500">
                    {index === 0 ? 'Maior Contribuinte' : 'Sócio'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-gray-700">Contribuições</span>
                </div>
                <span className="font-bold text-emerald-600">
                  R$ {member.totalContributions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Despesas</span>
                </div>
                <span className="font-bold text-blue-600">
                  R$ {member.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Despesas Criadas</span>
                </div>
                <span className="font-bold text-gray-800">{member.expenseCount}</span>
              </div>

              <div
                className={`p-4 rounded-lg border-2 ${
                  member.balance >= 0
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <p className="text-xs font-medium text-gray-600 mb-1">Balanço</p>
                <p
                  className={`text-2xl font-bold ${
                    member.balance >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {member.balance >= 0 ? '+' : ''}R${' '}
                  {Math.abs(member.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {member.balance >= 0 ? 'Ajudou mais do que gastou' : 'Gastou mais do que ajudou'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
