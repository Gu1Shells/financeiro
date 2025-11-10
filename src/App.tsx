import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthPage } from './components/Auth/AuthPage';
import { Dashboard } from './components/Dashboard/Dashboard';
import { WaveLoader } from './components/ui/wave-loader';

const AppContent = () => {
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.08),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.08),transparent_50%)]"></div>

        <div className="relative z-10 text-center space-y-8">
          <div className="space-y-4">
            <WaveLoader
              bars={7}
              message=""
              className="bg-gradient-to-r from-emerald-400 to-teal-400 shadow-lg shadow-emerald-500/50"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Carregando
            </p>
            <div className="flex items-center justify-center gap-1">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-100" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-200" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 text-center">
          <p className="text-gray-600 text-sm">Sistema de Gestão Financeira</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
        <div className="text-center max-w-xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-5 rounded-lg mb-4">
            <p className="font-bold text-lg mb-3">Erro de Conexão</p>
            <p className="text-sm mb-4">{error}</p>

            <div className="bg-red-50 border border-red-300 rounded p-4 text-left text-sm space-y-2 mt-4">
              <p className="font-semibold">Possíveis causas:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Bloqueador de anúncios ou extensão de privacidade ativa</li>
                <li>Firewall ou antivírus bloqueando a conexão</li>
                <li>Problemas de rede ou conexão instável</li>
              </ul>
              <p className="font-semibold mt-3">Soluções:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Desative bloqueadores de anúncios para este site</li>
                <li>Tente em modo anônimo/privado do navegador</li>
                <li>Tente em outro navegador</li>
                <li>Verifique sua conexão com a internet</li>
              </ul>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <AuthPage />;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
