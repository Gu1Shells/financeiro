import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadThemePreference();
    } else {
      setIsDarkMode(false);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const loadThemePreference = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('dark_mode')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        setIsDarkMode(data.dark_mode || false);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = async () => {
    if (!user) return;

    const newMode = !isDarkMode;
    setIsDarkMode(newMode);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ dark_mode: newMode })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating theme preference:', error);
        setIsDarkMode(!newMode);
      }
    } catch (error) {
      console.error('Error updating theme preference:', error);
      setIsDarkMode(!newMode);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
