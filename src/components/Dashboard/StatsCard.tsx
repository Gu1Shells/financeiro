import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color: string;
}

export const StatsCard = ({ title, value, icon: Icon, trend, trendUp, color }: StatsCardProps) => {
  const colorClasses = {
    emerald: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
  }[color];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md transition">
      <div className="flex items-center justify-between mb-4">
        <div className={`bg-gradient-to-br ${colorClasses} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <span className={`text-sm font-medium ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
    </div>
  );
};
