import { useState, useEffect } from 'react';
import { Upload, Building2, Users, Camera, Save, X, Link as LinkIcon } from 'lucide-react';
import { supabase, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CompanySettings {
  company_name: string;
  company_logo_url: string | null;
}

export const SettingsTab = () => {
  const { user } = useAuth();
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
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Configurações</h2>
        <p className="text-gray-600">Personalize sua empresa e perfis dos sócios</p>
      </div>

      <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-3 rounded-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Dados da Empresa</h3>
            <p className="text-sm text-gray-500">Logo e informações gerais</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Empresa
            </label>
            <input
              type="text"
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Nome da sua empresa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Logo da Empresa
            </label>
            <div className="flex items-start gap-6">
              {settings.company_logo_url ? (
                <div className="relative">
                  <img
                    src={settings.company_logo_url}
                    alt="Logo"
                    className="w-32 h-32 object-contain rounded-lg border-2 border-gray-200 bg-white"
                  />
                  <button
                    onClick={() => setSettings({ ...settings, company_logo_url: null })}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
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
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <p className="text-xs text-gray-500 mt-2">
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

      <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Fotos dos Sócios</h3>
            <p className="text-sm text-gray-500">Adicione fotos de perfil para cada membro</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-200 transition"
            >
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  {profile.profile_photo_url ? (
                    <div className="relative">
                      <img
                        src={profile.profile_photo_url}
                        alt={profile.full_name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
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
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center border-4 border-gray-200">
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

                <h4 className="font-bold text-gray-800 text-center">{profile.full_name}</h4>
                <p className="text-sm text-gray-500 mb-3">{profile.email}</p>

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
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
    </div>
  );
};
