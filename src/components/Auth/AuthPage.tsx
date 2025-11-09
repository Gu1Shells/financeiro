import { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import { ShaderAnimation } from '../ui/shader-lines';
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      <ShaderAnimation />

      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/40 pointer-events-none z-10" />

      <div className="w-full max-w-6xl flex items-center justify-center gap-16 relative z-20">
        <div className="hidden lg:flex flex-col items-center justify-center flex-1">
          <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/20 mb-8">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="w-32 h-32 object-contain"
              />
            ) : (
              <Building2 className="w-32 h-32 text-white" />
            )}
          </div>
          <h1 className="text-7xl font-bold text-white text-center tracking-tight">
            {companyName}
          </h1>
          <p className="text-lg text-white/80 text-center mt-4 max-w-md">
            Gerencie despesas compartilhadas com facilidade e transparência
          </p>
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
