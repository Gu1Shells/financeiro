import { LogOut, User, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export const DashboardHeader = () => {
  const { profile, signOut } = useAuth();
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('Sistema Financeiro');

  useEffect(() => {
    loadCompanySettings();
  }, []);

  const loadCompanySettings = async () => {
    try {
      const { data } = await supabase.from('company_settings').select('*').single();
      if (data) {
        setCompanyLogo(data.company_logo_url);
        setCompanyName(data.company_name || 'Sistema Financeiro');
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="w-10 h-10 object-contain rounded-lg"
              />
            ) : (
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">{companyName}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Gestão Compartilhada</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {profile?.profile_photo_url ? (
                <img
                  src={profile.profile_photo_url}
                  alt={profile.full_name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    {profile?.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-800 dark:text-white">{profile?.full_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sócio</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition text-gray-700 dark:text-gray-300 text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
