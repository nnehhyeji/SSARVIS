import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PATHS } from '../../routes/paths';
import { useUserStore } from '../../store/useUserStore';
import userApi from '../../apis/userApi';
import type { UserResponse } from '../../apis/userApi';
import { useVoiceLockStore } from '../../store/useVoiceLockStore';
import VoiceLockRegistrationModal from '../../components/settings/VoiceLockRegistrationModal';
import AccountSettings from '../../components/settings/AccountSettings';
import SecuritySettings from '../../components/settings/SecuritySettings';
import ProfileImageModal from '../../components/settings/ProfileImageModal';

const TEXT = {
  settings: '설정',
  account: '계정 설정',
  voiceLock: '음성 잠금',
  notSet: '미설정',
  minute: '분',
};

const MENU_ITEMS = [
  { id: 'account', label: TEXT.account },
  { id: 'voice', label: TEXT.voiceLock },
] as const;

const VALID_TABS = new Set(MENU_ITEMS.map((item) => item.id));

export default function SettingsPage() {
  const { tab = 'account' } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { fetchVoiceLockStatus } = useVoiceLockStore();

  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const data = await userApi.getUserProfile();
      setProfile(data);
      useUserStore.getState().login({
        id: data.id,
        email: data.email,
        nickname: data.nickname,
        customId: data.customId,
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }, []);

  useEffect(() => {
    if (!VALID_TABS.has(tab as (typeof MENU_ITEMS)[number]['id'])) {
      navigate(PATHS.SETTINGS_PARAM.replace(':tab', 'account'), { replace: true });
    }
  }, [navigate, tab]);

  useEffect(() => {
    void fetchVoiceLockStatus();
    void loadProfile();
  }, [fetchVoiceLockStatus, loadProfile]);

  const handleTabChange = (id: (typeof MENU_ITEMS)[number]['id']) => {
    navigate(PATHS.SETTINGS_PARAM.replace(':tab', id));
  };

  const formatMinutes = (seconds: number | null | undefined) =>
    seconds ? `${Math.floor(seconds / 60)}${TEXT.minute}` : TEXT.notSet;

  return (
    <div className="h-full w-full overflow-y-auto bg-white">
      <main className="mx-auto w-full max-w-[1080px] px-10 py-10">
        <h1 className="mb-12 text-5xl font-black tracking-tight text-gray-900">{TEXT.settings}</h1>

        <div className="flex gap-16">
          <aside className="w-52 shrink-0 pt-1">
            <div className="flex flex-col gap-4">
              {MENU_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={`text-left text-2xl font-black transition-colors ${
                    tab === item.id ? 'text-rose-500' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          <section className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22 }}
              >
                {tab === 'account' && (
                  <AccountSettings
                    profile={profile}
                    isVoiceLockRegistered={useVoiceLockStore.getState().isVoiceLockRegistered}
                    isSaving={isSaving}
                    setIsSaving={setIsSaving}
                    setProfile={setProfile}
                    loadProfile={loadProfile}
                    onOpenImageModal={() => setIsImageModalOpen(true)}
                    formatTime={formatMinutes}
                  />
                )}

                {tab === 'voice' && (
                  <SecuritySettings
                    isSaving={isSaving}
                    setIsSaving={setIsSaving}
                    voiceLockTimeout={profile?.voiceLockTimeout}
                    formatTime={formatMinutes}
                    onOpenRegistrationModal={() => setIsRegistrationModalOpen(true)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {isRegistrationModalOpen && (
          <VoiceLockRegistrationModal onClose={() => setIsRegistrationModalOpen(false)} />
        )}
      </AnimatePresence>

      {profile && (
        <ProfileImageModal
          isOpen={isImageModalOpen}
          profile={profile}
          onClose={() => setIsImageModalOpen(false)}
          onSuccess={(newUrl) => {
            setProfile((prev) => (prev ? { ...prev, userProfileImageUrl: newUrl ?? '' } : prev));
          }}
        />
      )}
    </div>
  );
}
