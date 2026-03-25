import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  User,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';
import { PATHS } from '../../routes/paths';
import CharacterScene from '../../components/features/character/CharacterScene';
import { useAICharacter } from '../../hooks/useAICharacter';
import { useUserStore } from '../../store/useUserStore';
import userApi from '../../apis/userApi';
import type { UserResponse } from '../../apis/userApi';
import authApi from '../../apis/authApi';
import { useVoiceLockStore } from '../../store/useVoiceLockStore';
import VoiceLockRegistrationModal from '../../components/settings/VoiceLockRegistrationModal';
import AccountSettings from '../../components/settings/AccountSettings';
import SecuritySettings from '../../components/settings/SecuritySettings';
import ProfileImageModal from '../../components/settings/ProfileImageModal';

const MENU_ITEMS = [
  { id: 'account', label: '개인정보 설정', icon: User },
  { id: 'security', label: '보안 설정', icon: ShieldCheck },
];

export default function SettingsPage() {
  const { tab = 'account' } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { logout } = useUserStore();
  const { fetchVoiceLockStatus } = useVoiceLockStore();
  const { faceType, mouthOpenRadius } = useAICharacter();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (seconds: number | null | undefined) => {
    if (!seconds || seconds === 0) return '미설정';
    if (seconds >= 3600) return `${Math.floor(seconds / 3600)}시간`;
    return `${Math.floor(seconds / 60)}분`;
  };

  const handleTabChange = (id: string) => navigate(PATHS.SETTINGS_PARAM.replace(':tab', id));

  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      try {
        await authApi.logout();
      } finally {
        logout();
        navigate(PATHS.LOGIN);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-gray-800 font-sans selection:bg-blue-100">
      {/* 네비게이션 */}
      <nav className="h-20 bg-white/80 backdrop-blur-xl sticky top-0 z-50 flex items-center px-8 border-b border-gray-100">
        <div className="flex items-center gap-6 max-w-7xl mx-auto w-full">
          <button
            onClick={() => navigate(PATHS.HOME)}
            className="group flex items-center gap-2 hover:bg-gray-100 px-4 py-2 rounded-2xl transition-all"
          >
            <ChevronLeft className="w-6 h-6 text-gray-400 group-hover:text-gray-900 group-hover:-translate-x-1 transition-all" />
            <span className="font-bold text-gray-400 group-hover:text-gray-900 transition-colors">
              나가기
            </span>
          </button>
          <div className="w-px h-6 bg-gray-200 ml-2" />
          <h1 className="text-2xl font-black tracking-tighter text-gray-900">Settings</h1>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto flex gap-12 px-8 py-12">
        {/* 사이드바 */}
        <aside className="w-[320px] flex flex-col shrink-0 gap-6">
          <div className="bg-white rounded-[48px] p-8 shadow-sm border border-gray-100 relative overflow-hidden flex flex-col items-center">
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-gray-50/50 to-transparent" />
            <div className="w-56 h-56 relative z-10 mb-4 cursor-grab active:cursor-grabbing">
              <CharacterScene
                faceType={faceType}
                mouthOpenRadius={mouthOpenRadius}
                mode="normal"
                isLockMode={false}
                isSpeaking={false}
                isMicOn={false}
              />
            </div>
            <div className="relative z-10 text-center">
              <div className="text-[10px] font-black tracking-[0.3em] text-gray-300 uppercase mb-1">
                Live Monitor
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-bold text-gray-500 tracking-tight">
                  나의 AI 대기 중
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[40px] p-4 shadow-sm border border-gray-100 flex flex-col gap-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`group w-full flex items-center gap-4 p-4 rounded-[28px] transition-all duration-300 ${isActive ? 'bg-gray-900 text-white shadow-xl shadow-gray-300 scale-[1.03] z-10' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
                >
                  <div
                    className={`p-2.5 rounded-2xl transition-colors ${isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-white border border-transparent group-hover:border-gray-100 shadow-sm'}`}
                  >
                    <Icon
                      className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-800'}`}
                    />
                  </div>
                  <span
                    className={`font-black text-lg transition-all ${isActive ? 'translate-x-1' : ''}`}
                  >
                    {item.label}
                  </span>
                  {isActive && <ChevronRight className="ml-auto w-5 h-5 text-white/40" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-4 p-6 rounded-[40px] bg-red-50 text-red-500 hover:bg-red-100 transition-all group font-black text-xl w-full"
          >
            <div className="p-3 rounded-2xl bg-white shadow-sm border border-red-100 group-hover:scale-110 transition-transform">
              <LogOut className="w-6 h-6" />
            </div>
            <span>Logout</span>
          </button>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {tab === 'account' ? (
                <AccountSettings
                  profile={profile}
                  isVoiceLockRegistered={useVoiceLockStore.getState().isVoiceLockRegistered}
                  isSaving={isSaving}
                  setIsSaving={setIsSaving}
                  setProfile={setProfile}
                  loadProfile={loadProfile}
                  onOpenImageModal={() => setIsImageModalOpen(true)}
                  formatTime={formatTime}
                />
              ) : tab === 'security' ? (
                <SecuritySettings
                  isSaving={isSaving}
                  setIsSaving={setIsSaving}
                  voiceLockTimeout={profile?.voiceLockTimeout}
                  formatTime={formatTime}
                  onOpenRegistrationModal={() => setIsRegistrationModalOpen(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[500px] text-gray-300">
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                    <SettingsIcon className="w-12 h-12 text-gray-200" />
                  </div>
                  <p className="text-2xl font-black italic">Coming Soon!</p>
                  <p className="mt-2 font-medium">이 기능은 현재 개발 중입니다.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* 모달들 */}
      <AnimatePresence>
        {isRegistrationModalOpen && (
          <VoiceLockRegistrationModal onClose={() => setIsRegistrationModalOpen(false)} />
        )}
      </AnimatePresence>

      <ProfileImageModal
        isOpen={isImageModalOpen}
        profile={profile}
        onClose={() => setIsImageModalOpen(false)}
        onSuccess={(newImageUrl) => {
          if (profile) setProfile({ ...profile, userProfileImageUrl: newImageUrl });
        }}
      />
    </div>
  );
}
