import { Home, CreditCard, TrendingUp, Plus, Users, FileText, Settings } from 'lucide-react';

interface DashboardNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewExpense: () => void;
}

export const DashboardNav = ({ activeTab, onTabChange, onNewExpense }: DashboardNavProps) => {
  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Home },
    { id: 'expenses', label: 'Despesas', icon: CreditCard },
    { id: 'reports', label: 'Relatórios', icon: TrendingUp },
    { id: 'members', label: 'Sócios', icon: Users },
    { id: 'settings', label: 'Configurações', icon: Settings },
    { id: 'logs', label: 'Logs de Exclusão', icon: FileText },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-16 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 border-b-2 transition whitespace-nowrap ${
                    isActive
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onNewExpense}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition font-medium shadow-sm ml-4"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nova Despesa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
