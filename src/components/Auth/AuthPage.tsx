import { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import { Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

      <div className="w-full max-w-6xl flex items-center justify-center gap-12">
        <div className="hidden lg:flex flex-col items-center justify-center flex-1">
          <div className="bg-white p-6 rounded-3xl shadow-2xl mb-8">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="w-24 h-24 object-contain"
              />
            ) : (
              <Building2 className="w-24 h-24 text-emerald-600" />
            )}
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4 text-center">
            {companyName}
          </h1>
          <p className="text-xl text-gray-600 text-center max-w-md">
            Gerencie despesas compartilhadas com facilidade e transparência
          </p>
          <div className="mt-8 flex gap-4">
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <p className="text-sm text-gray-600">Despesas Compartilhadas</p>
              <p className="text-2xl font-bold text-emerald-600">100%</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <p className="text-sm text-gray-600">Relatórios Detalhados</p>
              <p className="text-2xl font-bold text-teal-600">Real-time</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          {isLogin ? (
            <LoginForm onToggle={() => setIsLogin(false)} />
          ) : (
            <SignUpForm onToggle={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </div>
  );
};
