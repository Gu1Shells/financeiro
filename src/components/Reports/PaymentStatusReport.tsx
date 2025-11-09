import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, TrendingUp, TrendingDown, Filter, X, Calendar, DollarSign, SlidersHorizontal } from 'lucide-react';
import { supabase, Profile } from '../../lib/supabase';

interface UserDebtSummary {
  user_id: string;
  full_name: string;
  total_installments: number;
  paid_installments: number;
  pending_installments: number;
  total_debt: number;
  total_paid: number;
  profile_photo_url?: string | null;
}

interface InstallmentStatus {
  installment_id: string;
  expense_title: string;
  expense_category: string;
  installment_number: number;
  installment_amount: number;
  due_date: string;
  status: string;
  user_id: string;
  user_name: string;
  paid_amount: number;
  user_payment_status: string;
}

type SortField = 'due_date' | 'amount' | 'title' | 'category' | 'user';
type SortOrder = 'asc' | 'desc';

export const PaymentStatusReport = () => {
  const [userSummaries, setUserSummaries] = useState<UserDebtSummary[]>([]);
  const [detailedStatus, setDetailedStatus] = useState<InstallmentStatus[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'summary' | 'details'>('summary');
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    category: '',
    minAmount: '',
    maxAmount: '',
    status: 'all',
    showOnlyLate: false,
  });

  const [sort, setSort] = useState<{ field: SortField; order: SortOrder }>({
    field: 'due_date',
    order: 'asc',
  });

  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, statusRes, profilesRes, expensesRes] = await Promise.all([
        supabase.from('user_debt_summary').select('*'),
        supabase.from('installment_payment_status').select('*'),
        supabase.from('profiles').select('id, profile_photo_url'),
        supabase.from('expenses').select('category').order('category'),
      ]);

      if (summaryRes.data && profilesRes.data) {
        const summariesWithPhotos = summaryRes.data.map(summary => {
          const profile = profilesRes.data.find(p => p.id === summary.user_id);
          return {
            ...summary,
            profile_photo_url: profile?.profile_photo_url
          };
        });
        setUserSummaries(summariesWithPhotos);
      }
      if (statusRes.data) setDetailedStatus(statusRes.data);

      if (expensesRes.data) {
        const uniqueCategories = [...new Set(expensesRes.data.map(e => e.category))].filter(Boolean);
        setCategories(uniqueCategories as string[]);
      }
    } catch (error) {
      console.error('Error loading payment status:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = (data: InstallmentStatus[]) => {
    let filtered = [...data];

    if (selectedUser) {
      filtered = filtered.filter(s => s.user_id === selectedUser);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(s => new Date(s.due_date) >= new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      filtered = filtered.filter(s => new Date(s.due_date) <= new Date(filters.dateTo));
    }

    if (filters.category) {
      filtered = filtered.filter(s => s.expense_category === filters.category);
    }

    if (filters.minAmount) {
      filtered = filtered.filter(s => Number(s.installment_amount) >= Number(filters.minAmount));
    }

    if (filters.maxAmount) {
      filtered = filtered.filter(s => Number(s.installment_amount) <= Number(filters.maxAmount));
    }

    if (filters.status === 'pending') {
      filtered = filtered.filter(s => s.user_payment_status === 'pending');
    } else if (filters.status === 'paid') {
      filtered = filtered.filter(s => s.user_payment_status === 'paid');
    }

    if (filters.showOnlyLate) {
      filtered = filtered.filter(s =>
        s.user_payment_status === 'pending' && new Date(s.due_date) < new Date()
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'due_date':
          comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case 'amount':
          comparison = Number(a.installment_amount) - Number(b.installment_amount);
          break;
        case 'title':
          comparison = a.expense_title.localeCompare(b.expense_title);
          break;
        case 'category':
          comparison = a.expense_category.localeCompare(b.expense_category);
          break;
        case 'user':
          comparison = a.user_name.localeCompare(b.user_name);
          break;
      }

      return sort.order === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const filteredStatus = applyFiltersAndSort(detailedStatus);

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      category: '',
      minAmount: '',
      maxAmount: '',
      status: 'all',
      showOnlyLate: false,
    });
  };

  const activeFiltersCount =
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.minAmount ? 1 : 0) +
    (filters.maxAmount ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0) +
    (filters.showOnlyLate ? 1 : 0);

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
        <h2 className="text-2xl font-bold text-gray-800">Status de Pagamentos</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setView('summary')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              view === 'summary'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Resumo
          </button>
          <button
            onClick={() => setView('details')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              view === 'details'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Detalhes
          </button>
        </div>
      </div>

      {view === 'summary' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userSummaries.map((summary) => {
            const paymentRate = summary.total_installments > 0
              ? (summary.paid_installments / summary.total_installments) * 100
              : 0;

            return (
              <div
                key={summary.user_id}
                className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-5 hover:shadow-lg transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {summary.profile_photo_url ? (
                      <img
                        src={summary.profile_photo_url}
                        alt={summary.full_name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">
                          {summary.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <h3 className="text-lg font-bold text-gray-800">{summary.full_name}</h3>
                  </div>
                  {paymentRate === 100 ? (
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  ) : paymentRate > 0 ? (
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Parcelas Pagas:</span>
                    <span className="font-semibold text-emerald-600">
                      {summary.paid_installments} / {summary.total_installments}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Parcelas Pendentes:</span>
                    <span className="font-semibold text-red-600">{summary.pending_installments}</span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all"
                      style={{ width: `${paymentRate}%` }}
                    />
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Pago:</span>
                      <span className="text-sm font-bold text-emerald-600">
                        R$ {Number(summary.total_paid).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-gray-600">Dívida Pendente:</span>
                      <span className="text-sm font-bold text-red-600">
                        R$ {Number(summary.total_debt).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedUser(summary.user_id);
                      setView('details');
                    }}
                    className="w-full mt-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition"
                  >
                    Ver Detalhes
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="w-5 h-5 text-gray-600" />
                <h3 className="font-bold text-gray-800">Filtros e Ordenação</h3>
                {activeFiltersCount > 0 && (
                  <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
              >
                {showFilters ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            {showFilters && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sócio
                    </label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Todos os sócios</option>
                      {userSummaries.map((summary) => (
                        <option key={summary.user_id} value={summary.user_id}>
                          {summary.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de vencimento (de)
                    </label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de vencimento (até)
                    </label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoria
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Todas as categorias</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor mínimo (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={filters.minAmount}
                      onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor máximo (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={filters.maxAmount}
                      onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                      placeholder="999999.99"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="all">Todos</option>
                      <option value="pending">Pendentes</option>
                      <option value="paid">Pagas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ordenar por
                    </label>
                    <select
                      value={sort.field}
                      onChange={(e) => setSort({ ...sort, field: e.target.value as SortField })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="due_date">Data de vencimento</option>
                      <option value="amount">Valor</option>
                      <option value="title">Título da despesa</option>
                      <option value="category">Categoria</option>
                      <option value="user">Sócio</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ordem
                    </label>
                    <select
                      value={sort.order}
                      onChange={(e) => setSort({ ...sort, order: e.target.value as SortOrder })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="asc">Crescente</option>
                      <option value="desc">Decrescente</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.showOnlyLate}
                      onChange={(e) => setFilters({ ...filters, showOnlyLate: e.target.checked })}
                      className="w-4 h-4 text-emerald-500 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Mostrar apenas atrasadas
                    </span>
                  </label>

                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="ml-auto px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-medium flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Limpar Filtros
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">
                Parcelas {selectedUser && `- ${userSummaries.find(u => u.user_id === selectedUser)?.full_name}`}
              </h3>
              <p className="text-sm text-emerald-50 mt-1">
                {filteredStatus.length} parcela{filteredStatus.length !== 1 ? 's' : ''} encontrada{filteredStatus.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="p-6">
              {filteredStatus.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                  <p className="text-lg font-semibold text-gray-700">Nenhuma parcela encontrada</p>
                  <p className="text-sm text-gray-500 mt-1">Tente ajustar os filtros</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStatus.map((status, index) => {
                    const isLate = new Date(status.due_date) < new Date() && status.user_payment_status === 'pending';
                    const isPaid = status.user_payment_status === 'paid';

                    return (
                      <div
                        key={`${status.installment_id}-${status.user_id}-${index}`}
                        className={`p-4 rounded-lg border-2 ${
                          isPaid
                            ? 'border-emerald-200 bg-emerald-50'
                            : isLate
                            ? 'border-red-200 bg-red-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-800">{status.expense_title}</h4>
                              {isLate && (
                                <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-medium">
                                  ATRASADA
                                </span>
                              )}
                              {isPaid && (
                                <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                                  PAGA
                                </span>
                              )}
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                {status.expense_category}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span>Parcela #{status.installment_number}</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(status.due_date).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="font-semibold text-gray-800">
                                {status.user_name}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${isPaid ? 'text-emerald-600' : 'text-red-600'}`}>
                              R$ {Number(status.installment_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            {isLate && (
                              <p className="text-xs text-red-600 mt-1">
                                {Math.floor((new Date().getTime() - new Date(status.due_date).getTime()) / (1000 * 60 * 60 * 24))} dias de atraso
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
