import { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import { FloatingCards } from './FloatingCards';
import { AnimatedCharts } from './AnimatedCharts';
import { FloatingParticles } from './FloatingParticles';
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

      <FloatingParticles />
      <FloatingCards />
      <AnimatedCharts />

      <div className="w-full max-w-6xl flex items-center justify-center gap-12 relative z-10">
        <div className="hidden lg:flex flex-col items-center justify-center flex-1">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-2xl">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="w-32 h-32 object-contain"
              />
            ) : (
              <Building2 className="w-32 h-32 text-emerald-600" />
            )}
          </div>
          <h1 className="text-6xl font-bold text-gray-800 mt-8 text-center drop-shadow-lg">
            {companyName}
          </h1>
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
