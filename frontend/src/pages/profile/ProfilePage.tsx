import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import userApi from '../../apis/userApi';
import { PATHS } from '../../routes/paths';
import { Share2 } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userInfo } = useUserStore();
  const [profile, setProfile] = React.useState<any>(null);

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await userApi.getUserProfile();
        setProfile(data);
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };
    loadProfile();
  }, []);

  const handleEditClick = () => {
    navigate(PATHS.SETTINGS_PARAM.replace(':tab', 'account'));
  };

  const handleShareClick = () => {
    alert('명함 공유 기능이 준비 중입니다!');
  };

  return (
    <div className="w-full h-full bg-[#FDFCFB] overflow-y-auto">
      <div className="max-w-7xl mx-auto px-10 py-12">
        {/* 프로필 헤더 섹션 (배너 + 프로필 이미지 + 정보) */}
        <div className="relative w-full rounded-[40px] overflow-hidden shadow-2xl shadow-gray-200/50 bg-[#E0D7D0] min-h-[500px] flex flex-col justify-end p-12 group">
          {/* 정중앙 프로필 이미지 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-56 h-56 rounded-full overflow-hidden border-[10px] border-white shadow-2xl bg-white/50 backdrop-blur-sm transition-transform duration-500 group-hover:scale-105">
              <img
                src={
                  profile?.userProfileImageUrl ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo?.nickname || 'user'}`
                }
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* 하단 정보 영역 */}
          <div className="flex justify-between items-end relative z-10">
            {/* 왼쪽: 닉네임 & 아이디 */}
            <div className="flex flex-col gap-2">
              <h1 className="text-6xl font-black text-gray-900 tracking-tighter drop-shadow-sm">
                {userInfo?.nickname || 'nneh'}
              </h1>
              <p className="text-xl font-bold text-gray-700/60 tracking-tight">
                @{userInfo?.customId || 'unknown_id'}
              </p>
              <p className="text-gray-500/80 font-bold text-lg mt-1">{userInfo?.email}</p>
            </div>

            {/* 오른쪽: 액션 버튼들 */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleEditClick}
                className="px-8 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl shadow-lg shadow-rose-500/30 transition-all active:scale-95 text-lg"
              >
                편집
              </button>
              <button
                onClick={handleShareClick}
                className="w-14 h-14 flex items-center justify-center bg-white/90 hover:bg-white text-gray-800 rounded-full shadow-lg transition-all active:scale-95 group/share"
                title="명함 공유"
              >
                <Share2 className="w-6 h-6 group-hover/share:text-rose-500 transition-colors" />
              </button>
            </div>
          </div>

          {/* 배경에 은은한 텍스쳐나 그라데이션 추가 (고급화) */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-white/10 pointer-events-none" />
        </div>

        {/* 하단 영역 (향후 구상을 위해 비워둠) */}
        <div className="mt-16 w-full flex flex-col items-center">
          <div className="w-full h-px bg-gray-100 mb-10" />
          <p className="text-gray-300 font-black italic tracking-widest uppercase opacity-30">
            Your future story continues here...
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
