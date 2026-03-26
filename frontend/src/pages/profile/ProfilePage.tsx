import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/useUserStore';
import userApi from '../../apis/userApi';
import followApi from '../../apis/followApi';
import { PATHS } from '../../routes/paths';
import { Share2 } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userInfo } = useUserStore();
  const [profile, setProfile] = React.useState<any>(null);
  const [followingCount, setFollowingCount] = React.useState(0);
  const [followerCount, setFollowerCount] = React.useState(0);

  React.useEffect(() => {
    const loadProfileData = async () => {
      try {
        const [profileData, followList, followerList] = await Promise.all([
          userApi.getUserProfile(),
          followApi.getFollowList(),
          followApi.getFollowerList()
        ]);
        
        setProfile(profileData);
        setFollowingCount(followList.data?.length || 0);
        setFollowerCount(followerList.data?.length || 0);
      } catch (err) {
        console.error('Failed to load profile data:', err);
      }
    };
    loadProfileData();
  }, []);

  const handleEditClick = () => {
    navigate(PATHS.SETTINGS_PARAM.replace(':tab', 'account'));
  };

  const handleShareClick = () => {
    const myId = userInfo?.id;
    if (!myId) return;

    const shareUrl = `${window.location.origin}/${myId}`;
    
    // 클립보드 복사
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        alert('내 명함 링크가 클립보드에 복사되었습니다! 🪪');
      })
      .catch((err) => {
        console.error('Failed to copy link:', err);
      });
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
                src={profile?.userProfileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo?.nickname || 'user'}`}
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
              
              {/* 팔로워/팔로잉 카운트 영역 */}
              <div className="flex items-center gap-6 my-2">
                <div className="flex items-center gap-2 group/stat cursor-default">
                  <span className="text-2xl font-black text-gray-900">{followerCount}</span>
                  <span className="text-lg font-bold text-gray-500/60">팔로워</span>
                </div>
                <div className="flex-none w-1 h-1 rounded-full bg-gray-300" />
                <div className="flex items-center gap-2 group/stat cursor-default">
                  <span className="text-2xl font-black text-gray-900">{followingCount}</span>
                  <span className="text-lg font-bold text-gray-500/60">팔로잉</span>
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <p className="text-xl font-bold text-gray-700/60 tracking-tight">
                  @{userInfo?.customId || 'unknown_id'}
                </p>
                <p className="text-gray-500/80 font-bold text-lg">{userInfo?.email}</p>
              </div>
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
