import { useState, useEffect } from 'react';
import { LogIn, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface LoginFormProps {
  onToggle: () => void;
}

export const LoginForm = ({ onToggle }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const { signIn } = useAuth();

  useEffect(() => {
    loadCompanyLogo();
  }, []);

  const loadCompanyLogo = async () => {
    try {
      const { data } = await supabase.from('company_settings').select('company_logo_url').single();
      if (data?.company_logo_url) {
        setCompanyLogo(data.company_logo_url);
      }
    } catch (error) {
      console.error('Error loading company logo:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError('Email ou senha inválidos');
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
        <div className="flex flex-col items-center justify-center mb-8 lg:hidden">
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl shadow-lg mb-4 border border-white/20">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Logo"
                className="w-16 h-16 object-contain"
              />
            ) : (
              <Building2 className="w-16 h-16 text-white" />
            )}
          </div>
        </div>

        <div className="flex items-center justify-center mb-8 lg:mb-8">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl shadow-lg">
            <LogIn className="w-8 h-8 text-white" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center text-white mb-2">Bem-vindo</h2>
        <p className="text-center text-white/80 mb-8">Entre com sua conta</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-white placeholder-white/50"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-white placeholder-white/50"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm backdrop-blur-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-white/80">
            Não tem uma conta?{' '}
            <button
              onClick={onToggle}
              className="text-emerald-400 font-semibold hover:text-emerald-300 transition"
            >
              Cadastre-se
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
