import { useState, useEffect } from 'react';
import { Upload, Building2, Users, Camera, Save, X } from 'lucide-react';
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
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `company/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      await supabase
        .from('company_settings')
        .update({ company_logo_url: publicUrl })
        .eq('id', (await supabase.from('company_settings').select('id').single()).data?.id);

      setSettings({ ...settings, company_logo_url: publicUrl });
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Erro ao fazer upload da logo. Tente novamente.');
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
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${profileId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath);

      await supabase
        .from('profiles')
        .update({ profile_photo_url: publicUrl })
        .eq('id', profileId);

      setProfiles(
        profiles.map((p) =>
          p.id === profileId ? { ...p, profile_photo_url: publicUrl } : p
        )
      );
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      alert('Erro ao fazer upload da foto. Tente novamente.');
    } finally {
      setUploadingProfile(null);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_settings')
        .update({ company_name: settings.company_name })
        .eq('id', (await supabase.from('company_settings').select('id').single()).data?.id);

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
            <div className="flex items-center gap-6">
              {settings.company_logo_url ? (
                <div className="relative">
                  <img
                    src={settings.company_logo_url}
                    alt="Logo"
                    className="w-32 h-32 object-contain rounded-lg border-2 border-gray-200"
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

              <label className="cursor-pointer">
                <div className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  {uploadingLogo ? 'Enviando...' : 'Fazer Upload'}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploadingLogo}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              PNG, JPG ou GIF. Máximo 2MB. Recomendado: 400x400px
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
                    <img
                      src={profile.profile_photo_url}
                      alt={profile.full_name}
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                    />
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
                <p className="text-sm text-gray-500">{profile.email}</p>

                {uploadingProfile === profile.id && (
                  <div className="mt-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent"></div>
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
