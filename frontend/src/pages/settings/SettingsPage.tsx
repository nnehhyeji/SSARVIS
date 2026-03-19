import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  User,
  Settings as SettingsIcon,
  Mic,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { PATHS } from '../../routes/paths';
import CharacterScene from '../../components/features/character/CharacterScene';
import { useAICharacter } from '../../hooks/useAICharacter';
import { useUserStore } from '../../store/useUserStore';
import userApi from '../../apis/userApi';
import authApi from '../../apis/authApi';

const MENU_ITEMS = [
  { id: 'account', label: '개인정보 설정', icon: User, color: 'bg-blue-500' },
  { id: 'ai', label: '클로닝 설정', icon: Mic, color: 'bg-pink-500' },
];

export default function SettingsPage() {
  const { tab = 'account' } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { userInfo, logout } = useUserStore();

  // AI Character logic
  const { faceType, mouthOpenRadius } = useAICharacter();

  const handleBack = () => {
    navigate(PATHS.HOME);
  };

  const handleTabChange = (id: string) => {
    navigate(PATHS.SETTINGS_PARAM.replace(':tab', id));
  };

  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      try {
        await authApi.logout();
        logout(); // Store 초기화 및 토큰 삭제
        navigate(PATHS.LOGIN);
      } catch {
        // 로그아웃 실패 시에도 클라이언트는 로그아웃 처리
        logout();
        navigate(PATHS.LOGIN);
      }
    }
  };

  const handleWithdraw = async () => {
    if (window.confirm('정말로 탈퇴하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.')) {
      try {
        await userApi.withdraw();
        alert('회원 탈퇴가 완료되었습니다.');
        logout();
        navigate(PATHS.LOGIN);
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          alert(error.response?.data?.message || '탈퇴 처리 중 오류가 발생했습니다.');
        } else {
          alert('탈퇴 처리 중 알 수 없는 오류가 발생했습니다.');
        }
      }
    }
  };

  // --- Content Renderers ---
  const renderAccountSettings = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">개인정보 설정</h2>
        <p className="text-gray-500 font-medium">서비스 내에서 표시되는 회원 정보를 관리합니다.</p>
      </div>

      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-100 to-green-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
              <div className="flex flex-col items-center justify-center h-full">
                <div className="flex gap-2">
                  <div className="w-1.5 h-2.5 bg-gray-800 rounded-full" />
                  <div className="w-1.5 h-2.5 bg-gray-800 rounded-full" />
                </div>
                <div className="w-3.5 h-2 border-b-2 border-gray-800 rounded-full mt-1" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{userInfo?.nickname || '사용자'}</h3>
              <p className="text-gray-400">{userInfo?.email || 'email@example.com'}</p>
            </div>
          </div>
          <button className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-2xl font-bold text-gray-600 transition-colors">
            이미지 변경
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-gray-50 bg-gray-50/30 flex items-center justify-between group hover:border-gray-200 transition-all">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                Nickname
              </span>
              <span className="text-lg font-bold text-gray-800">{userInfo?.nickname}</span>
            </div>
            <button className="p-2 text-blue-500 font-bold hover:underline">수정</button>
          </div>
          <div className="p-5 rounded-2xl border border-gray-50 bg-gray-50/30 flex items-center justify-between group hover:border-gray-200 transition-all">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                Email
              </span>
              <span className="text-lg font-bold text-gray-800">{userInfo?.email}</span>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-black">
              인증됨
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button className="flex-1 py-5 bg-gray-900 text-white rounded-[24px] font-black text-xl shadow-xl shadow-gray-200 hover:bg-black transition-all hover:-translate-y-1">
          저장하기
        </button>
        <button
          onClick={handleWithdraw}
          className="px-8 py-5 text-red-400 font-bold hover:bg-red-50 rounded-[24px] transition-colors"
        >
          회원 탈퇴
        </button>
      </div>
    </div>
  );

  const renderAISettings = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">클로닝 설정</h2>
        <p className="text-gray-500 font-medium">
          나의 쌍둥이 AI의 음성과 성격을 커스터마이징 하세요.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-pink-500/5 transition-all group flex flex-col items-center text-center cursor-pointer">
          <div className="w-16 h-16 rounded-3xl bg-pink-100 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-pink-500 transition-all">
            <Mic className="w-8 h-8 text-pink-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">음성 관리</h3>
          <p className="text-gray-400 font-medium leading-relaxed mb-8">
            현재 1개의 음성이 등록되어 있습니다.
            <br />
            새로운 음성을 학습시키거나 선택합니다.
          </p>
          <div className="mt-auto w-full py-4 bg-gray-50 rounded-2xl font-bold text-gray-600 group-hover:bg-pink-50 transition-colors">
            설정 변경
          </div>
        </div>

        <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-green-500/5 transition-all group flex flex-col items-center text-center cursor-pointer">
          <div className="w-16 h-16 rounded-3xl bg-green-100 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-green-500 transition-all">
            <SettingsIcon className="w-8 h-8 text-green-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">성격 재설정</h3>
          <p className="text-gray-400 font-medium leading-relaxed mb-8">
            AI의 말투, 전문성 정도,
            <br />
            이모티콘 사용 빈도 등을 조절합니다.
          </p>
          <div className="mt-auto w-full py-4 bg-gray-50 rounded-2xl font-bold text-gray-600 group-hover:bg-green-50 transition-colors">
            설정 변경
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[40px] p-8 text-white relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="text-2xl font-black mb-1 tracking-tight">페르소나 분석 리포트</h4>
            <p className="text-white/80 font-medium">
              대화 내용을 바탕으로 학습된 성격 리포트를 확인하세요.
            </p>
          </div>
          <button className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-lg hover:scale-105 transition-transform active:scale-95 shadow-lg">
            리포트 보기
          </button>
        </div>
      </div>
    </div>
  );

  const renderPlaceholder = () => (
    <div className="flex flex-col items-center justify-center h-[500px] text-gray-300">
      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
        <SettingsIcon className="w-12 h-12 text-gray-200" />
      </div>
      <p className="text-2xl font-black italic">Coming Soon!</p>
      <p className="mt-2 font-medium">이 기능은 현재 개발 중입니다.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-gray-800 font-sans selection:bg-blue-100">
      {/* Navbar */}
      <nav className="h-20 bg-white/80 backdrop-blur-xl sticky top-0 z-50 flex items-center px-8 border-b border-gray-100">
        <div className="flex items-center gap-6 max-w-7xl mx-auto w-full">
          <button
            onClick={handleBack}
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
        {/* Sidebar */}
        <aside className="w-[320px] flex flex-col shrink-0 gap-6">
          {/* AI Character Mini View */}
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

          {/* Navigation Menu */}
          <div className="bg-white rounded-[40px] p-4 shadow-sm border border-gray-100 flex flex-col gap-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`
                     group w-full flex items-center gap-4 p-4 rounded-[28px] transition-all duration-300
                     ${
                       isActive
                         ? 'bg-gray-900 text-white shadow-xl shadow-gray-300 scale-[1.03] z-10'
                         : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                     }
                   `}
                >
                  <div
                    className={`
                      p-2.5 rounded-2xl transition-colors
                      ${isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-white border border-transparent group-hover:border-gray-100 shadow-sm'}
                    `}
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

          {/* Logout */}
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

        {/* Main Content */}
        <main className="flex-1 max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {tab === 'account'
                ? renderAccountSettings()
                : tab === 'ai'
                  ? renderAISettings()
                  : renderPlaceholder()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
