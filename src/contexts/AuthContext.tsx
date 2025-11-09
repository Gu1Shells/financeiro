import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        console.log('🔄 Iniciando autenticação...');

        timeoutId = setTimeout(() => {
          if (mounted && loading) {
            console.error('⏱️ Auth initialization timeout');
            setError('Timeout ao conectar. Verifique sua conexão.');
            setLoading(false);
          }
        }, 10000);

        console.log('📡 Tentando obter sessão do Supabase...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('📥 Resposta recebida:', { session: !!session, error: !!error });

        clearTimeout(timeoutId);

        if (!mounted) return;

        if (error) {
          console.error('❌ Session error:', error);
          await supabase.auth.signOut({ scope: 'local' });
          setUser(null);
          setProfile(null);
          setError(null);
          setLoading(false);
          return;
        }

        console.log('✅ Sessão obtida com sucesso');
        setUser(session?.user ?? null);
        if (session?.user) {
          console.log('👤 Carregando perfil do usuário...');
          await loadProfile(session.user.id);
        } else {
          console.log('👤 Nenhum usuário logado');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('💥 Auth initialization error:', err);
        console.error('💥 Error details:', {
          message: err?.message,
          stack: err?.stack,
          name: err?.name,
        });

        if (mounted) {
          let errorMessage = 'Erro ao conectar ao servidor';

          if (err?.message?.includes('fetch') || err?.message?.includes('Failed to fetch')) {
            errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
          } else if (err?.message?.includes('CORS')) {
            errorMessage = 'Erro de CORS. O servidor pode estar com problemas de configuração.';
          } else if (err?.message?.includes('network')) {
            errorMessage = 'Erro de rede. Verifique sua conexão.';
          } else if (err?.message) {
            errorMessage = err.message;
          }

          console.error('📢 Mostrando erro para usuário:', errorMessage);
          setError(errorMessage);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (() => {
        if (!mounted) return;

        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) return { error };

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: data.user.id, full_name: fullName }]);

      if (profileError) return { error: profileError };
    }

    return { error: null };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setUser(null);
      setProfile(null);
      localStorage.clear();
      sessionStorage.clear();
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
