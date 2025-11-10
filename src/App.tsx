import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthPage } from './components/Auth/AuthPage';
import { Dashboard } from './components/Dashboard/Dashboard';

const AppContent = () => {
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Carregando...</p>
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
