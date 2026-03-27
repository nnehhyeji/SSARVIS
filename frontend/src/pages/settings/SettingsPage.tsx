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

const MENU_ITEMS = [
  { id: 'account', label: '개인정보 설정' },
  { id: 'ai', label: 'AI 설정' },
  { id: 'voice', label: '음성 잠금 설정' },
];

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
    fetchVoiceLockStatus();
    loadProfile();
  }, [fetchVoiceLockStatus, loadProfile]);

  const handleTabChange = (id: string) => navigate(PATHS.SETTINGS_PARAM.replace(':tab', id));

  return (
    <div className="w-full h-full bg-white overflow-y-auto">
      <main className="max-w-[1200px] w-full mx-auto px-16 py-16">
        <h1 className="text-6xl font-black text-gray-900 mb-20 tracking-tighter">설정</h1>

        <div className="flex gap-24">
          {/* 좌측 메뉴 탭 */}
          <aside className="w-64 shrink-0 flex flex-col gap-6 pt-2">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`text-left text-3xl font-black transition-all ${
                  tab === item.id ? 'text-rose-500' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </aside>

          {/* 우측 상세 컨텐츠 */}
          <section className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
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
                    formatTime={(s) => (s ? `${Math.floor(s / 60)}분` : '미설정')}
                  />
                )}
                {tab === 'ai' && (
                  <div className="py-20 text-center">
                    <p className="text-2xl font-black text-gray-300 italic">
                      공백 (AI 설정 준비 중)
                    </p>
                  </div>
                )}
                {tab === 'voice' && (
                  <SecuritySettings
                    isSaving={isSaving}
                    setIsSaving={setIsSaving}
                    voiceLockTimeout={profile?.voiceLockTimeout}
                    formatTime={(s) => (s ? `${Math.floor(s / 60)}분` : '미설정')}
                    onOpenRegistrationModal={() => setIsRegistrationModalOpen(true)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </section>
        </div>
      </main>

      {/* 모달 */}
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
          onSuccess={(newUrl) => setProfile({ ...profile, userProfileImageUrl: newUrl })}
        />
      )}
    </div>
  );
}
