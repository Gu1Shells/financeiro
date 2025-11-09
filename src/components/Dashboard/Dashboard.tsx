import { useState } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { DashboardNav } from './DashboardNav';
import { OverviewTab } from './OverviewTab';
import { ExpensesTab } from '../Expenses/ExpensesTab';
import { ReportsTab } from '../Reports/ReportsTab';
import { MembersTab } from '../Members/MembersTab';
import { SettingsTab } from '../Settings/SettingsTab';
import { NewExpenseModal } from '../Expenses/NewExpenseModal';
import { ExpenseDetailsModal } from '../Expenses/ExpenseDetailsModal';
import { Expense } from '../../lib/supabase';

export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleExpenseSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleExpenseClick = (expense: Expense) => {
    setSelectedExpense(expense);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader />
      <DashboardNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewExpense={() => setShowNewExpenseModal(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 dark:text-white">
        <div key={refreshKey}>
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'expenses' && <ExpensesTab onExpenseClick={handleExpenseClick} />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'members' && <MembersTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>

      {showNewExpenseModal && (
        <NewExpenseModal
          onClose={() => setShowNewExpenseModal(false)}
          onSuccess={handleExpenseSuccess}
        />
      )}

      {selectedExpense && (
        <ExpenseDetailsModal
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          onUpdate={handleExpenseSuccess}
        />
      )}
    </div>
  );
};
