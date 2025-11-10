import { useState, useEffect } from 'react';
import { Upload, Building2, Users, Camera, Save, X, Link as LinkIcon, Moon, Sun, Trash2, AlertTriangle } from 'lucide-react';
import { supabase, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

interface CompanySettings {
  company_name: string;
  company_logo_url: string | null;
}

export const SettingsTab = () => {
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [settings, setSettings] = useState<CompanySettings>({
    company_name: 'Minha Empresa',
    company_logo_url: null,
  });
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState<string | null>(null);
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [showLogoUrlInput, setShowLogoUrlInput] = useState(false);
  const [profileUrlInputs, setProfileUrlInputs] = useState<Record<string, string>>({});
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, profilesRes] = await Promise.all([
        supabase.from('company_settings').select('*').single(),
        supabase.from('profiles').select('*').order('full_name'),
      ]);

      if (settingsRes.data) {
        setSettings(settingsRes.data);
      }
      if (profilesRes.data) {
        setProfiles(profilesRes.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const base64 = await convertToBase64(file);

      const settingsId = (await supabase.from('company_settings').select('id').single()).data?.id;

      const { error } = await supabase
        .from('company_settings')
        .update({ company_logo_url: base64 })
        .eq('id', settingsId);

      if (error) throw error;

      setSettings({ ...settings, company_logo_url: base64 });
      alert('Logo enviada com sucesso!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Erro ao fazer upload da logo. Tente novamente.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoUrlSubmit = async () => {
    if (!logoUrlInput.trim()) {
      alert('Por favor, insira uma URL válida');
      return;
    }

    setUploadingLogo(true);
    try {
      const settingsId = (await supabase.from('company_settings').select('id').single()).data?.id;

      const { error } = await supabase
        .from('company_settings')
        .update({ company_logo_url: logoUrlInput.trim() })
        .eq('id', settingsId);

      if (error) throw error;

      setSettings({ ...settings, company_logo_url: logoUrlInput.trim() });
      setLogoUrlInput('');
      setShowLogoUrlInput(false);
      alert('Logo atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating logo:', error);
      alert('Erro ao atualizar logo. Tente novamente.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleProfilePhotoUpload = async (
    profileId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploadingProfile(profileId);
    try {
      const base64 = await convertToBase64(file);

      const { error } = await supabase
        .from('profiles')
        .update({ profile_photo_url: base64 })
        .eq('id', profileId);

      if (error) throw error;

      setProfiles(
        profiles.map((p) =>
          p.id === profileId ? { ...p, profile_photo_url: base64 } : p
        )
      );
      alert('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      alert('Erro ao fazer upload da foto. Tente novamente.');
    } finally {
      setUploadingProfile(null);
    }
  };

  const handleProfileUrlSubmit = async (profileId: string) => {
    const url = profileUrlInputs[profileId]?.trim();
    if (!url) {
      alert('Por favor, insira uma URL válida');
      return;
    }

    setUploadingProfile(profileId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ profile_photo_url: url })
        .eq('id', profileId);

      if (error) throw error;

      setProfiles(
        profiles.map((p) =>
          p.id === profileId ? { ...p, profile_photo_url: url } : p
        )
      );
      setProfileUrlInputs({ ...profileUrlInputs, [profileId]: '' });
      alert('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating profile photo:', error);
      alert('Erro ao atualizar foto. Tente novamente.');
    } finally {
      setUploadingProfile(null);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const settingsId = (await supabase.from('company_settings').select('id').single()).data?.id;

      const { error } = await supabase
        .from('company_settings')
        .update({ company_name: settings.company_name })
        .eq('id', settingsId);

      if (error) throw error;
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSystem = async () => {
    setResetting(true);
    try {
      const { error: contribError } = await supabase
        .from('payment_contributions')
        .delete()
        .gte('created_at', '1900-01-01');
      if (contribError) throw contribError;

      const { error: historyError } = await supabase
        .from('installment_edit_history')
        .delete()
        .gte('edited_at', '1900-01-01');
      if (historyError) throw historyError;

      const { error: installmentsError } = await supabase
        .from('installment_payments')
        .delete()
        .gte('created_at', '1900-01-01');
      if (installmentsError) throw installmentsError;

      const { error: deletionLogsError } = await supabase
        .from('expense_deletion_logs')
        .delete()
        .gte('deleted_at', '1900-01-01');
      if (deletionLogsError) throw deletionLogsError;

      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .gte('created_at', '1900-01-01');
      if (expensesError) throw expensesError;

      const { error: auditError } = await supabase
        .from('audit_logs')
        .delete()
        .gte('created_at', '1900-01-01');
      if (auditError) throw auditError;

      alert('Sistema zerado com sucesso! Todos os dados financeiros foram removidos.');
      setShowResetModal(false);
      setResetStep(1);
      window.location.reload();
    } catch (error) {
      console.error('Error resetting system:', error);
      alert('Erro ao zerar o sistema. Verifique se há dados vinculados ou tente novamente.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Configurações</h2>
        <p className="text-gray-600 dark:text-gray-400">Personalize sua empresa e perfis dos sócios</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-lg">
              {isDarkMode ? <Moon className="w-6 h-6 text-white" /> : <Sun className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Tema Escuro</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Preferência pessoal de visualização</p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
              isDarkMode ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                isDarkMode ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ative o modo escuro para uma experiência visual mais confortável em ambientes com pouca luz. Esta preferência é salva apenas para o seu usuário.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Dados da Empresa</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Logo e informações gerais</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome da Empresa
            </label>
            <input
              type="text"
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Nome da sua empresa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Logo da Empresa
            </label>
            <div className="flex items-start gap-6">
              {settings.company_logo_url ? (
                <div className="relative">
                  <img
                    src={settings.company_logo_url}
                    alt="Logo"
                    className="w-32 h-32 object-contain rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
                  />
                  <button
                    onClick={() => setSettings({ ...settings, company_logo_url: null })}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  <Building2 className="w-12 h-12 text-gray-400" />
                </div>
              )}

              <div className="flex-1 space-y-3">
                <label className="cursor-pointer">
                  <div className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition flex items-center gap-2 justify-center">
                    <Upload className="w-5 h-5" />
                    {uploadingLogo ? 'Enviando...' : 'Upload do Computador'}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                </label>

                <button
                  onClick={() => setShowLogoUrlInput(!showLogoUrlInput)}
                  className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition flex items-center gap-2 justify-center"
                >
                  <LinkIcon className="w-5 h-5" />
                  Usar URL de Imagem
                </button>

                {showLogoUrlInput && (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={logoUrlInput}
                      onChange={(e) => setLogoUrlInput(e.target.value)}
                      placeholder="https://exemplo.com/logo.png"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={handleLogoUrlSubmit}
                      disabled={uploadingLogo}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                    >
                      OK
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Upload: PNG, JPG ou GIF (máx 2MB) | URL: Link direto para imagem
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-2 border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Fotos dos Sócios</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Adicione fotos de perfil para cada membro</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-emerald-200 dark:hover:border-emerald-700 transition bg-white dark:bg-gray-750"
            >
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  {profile.profile_photo_url ? (
                    <div className="relative">
                      <img
                        src={profile.profile_photo_url}
                        alt={profile.full_name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600"
                      />
                      <button
                        onClick={async () => {
                          await supabase
                            .from('profiles')
                            .update({ profile_photo_url: null })
                            .eq('id', profile.id);
                          setProfiles(
                            profiles.map((p) =>
                              p.id === profile.id ? { ...p, profile_photo_url: null } : p
                            )
                          );
                        }}
                        className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center border-4 border-gray-200 dark:border-gray-600">
                      <span className="text-3xl font-bold text-white">
                        {profile.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 p-2 bg-blue-500 text-white rounded-full cursor-pointer hover:bg-blue-600 transition shadow-lg">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleProfilePhotoUpload(profile.id, e)}
                      className="hidden"
                      disabled={uploadingProfile === profile.id}
                    />
                  </label>
                </div>

                <h4 className="font-bold text-gray-800 dark:text-white text-center">{profile.full_name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{user?.id === profile.id ? profile.id : ''}</p>

                {uploadingProfile === profile.id ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent"></div>
                ) : (
                  <div className="w-full space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={profileUrlInputs[profile.id] || ''}
                        onChange={(e) =>
                          setProfileUrlInputs({ ...profileUrlInputs, [profile.id]: e.target.value })
                        }
                        placeholder="URL da foto"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={() => handleProfileUrlSubmit(profile.id)}
                        className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl shadow-md border-2 border-red-200 dark:border-red-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-gradient-to-br from-red-500 to-orange-600 p-3 rounded-lg">
            <Trash2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-900 dark:text-red-300">Zona de Perigo</h3>
            <p className="text-sm text-red-700 dark:text-red-400">Ações irreversíveis do sistema</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-red-300 dark:border-red-700 p-4">
          <h4 className="font-bold text-gray-800 dark:text-white mb-2">Zerar Sistema</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Remove TODAS as despesas, parcelas, pagamentos e logs de auditoria. Esta ação é permanente e não pode ser desfeita.
            Use apenas se quiser recomeçar do zero.
          </p>
          <button
            onClick={() => setShowResetModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-orange-700 transition flex items-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Zerar Todo o Sistema
          </button>
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    {resetStep === 1 ? 'Confirmar Exclusão' : 'Última Confirmação'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Etapa {resetStep} de 2</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {resetStep === 1 ? (
                <>
                  <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                    <p className="text-red-900 dark:text-red-300 font-semibold mb-2">⚠️ ATENÇÃO</p>
                    <p className="text-sm text-red-800 dark:text-red-400">
                      Esta ação irá remover permanentemente:
                    </p>
                    <ul className="text-sm text-red-800 dark:text-red-400 list-disc list-inside mt-2 space-y-1">
                      <li>Todas as despesas</li>
                      <li>Todas as parcelas</li>
                      <li>Todos os pagamentos</li>
                      <li>Todo o histórico de edições</li>
                      <li>Todos os logs de auditoria</li>
                    </ul>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    Tem certeza que deseja continuar? Esta ação NÃO pode ser desfeita.
                  </p>
                </>
              ) : (
                <>
                  <div className="bg-gradient-to-br from-red-500 to-orange-600 text-white rounded-lg p-6 mb-4 text-center">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-3" />
                    <p className="font-bold text-lg mb-2">ÚLTIMA CHANCE!</p>
                    <p className="text-sm opacity-90">
                      Todos os dados financeiros serão perdidos permanentemente.
                    </p>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-6 text-center font-semibold">
                    Você realmente tem certeza absoluta?
                  </p>
                </>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetStep(1);
                  }}
                  disabled={resetting}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                {resetStep === 1 ? (
                  <button
                    onClick={() => setResetStep(2)}
                    className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition"
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    onClick={handleResetSystem}
                    disabled={resetting}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-700 text-white rounded-lg font-semibold hover:from-red-700 hover:to-orange-800 transition disabled:opacity-50"
                  >
                    {resetting ? 'Zerando...' : 'SIM, ZERAR TUDO'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
