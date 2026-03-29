import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';
import userApi, { type UserResponse } from '../../apis/userApi';
import followApi, {
  type FollowListResponse,
  type FollowerListResponse,
  type TopChatterResponse,
} from '../../apis/followApi';
import AvatarRow, { type AvatarRowItem } from '../../components/profile/AvatarRow';
import { PATHS } from '../../routes/paths';
import { toast } from '../../store/useToastStore';
import { initialsAvatarFallback } from '../../utils/avatar';

const sortByTopChatters = (items: AvatarRowItem[], topChatters: TopChatterResponse[]) => {
  const ranking = new Map<number, number>();

  topChatters.forEach((item, index) => {
    ranking.set(item.userId, item.totalMessageCount ?? Math.max(topChatters.length - index, 0));
  });

  return [...items].sort((a, b) => {
    const aCount = ranking.get(a.userId) ?? -1;
    const bCount = ranking.get(b.userId) ?? -1;

    if (aCount !== bCount) {
      return bCount - aCount;
    }

    return a.nickname.localeCompare(b.nickname);
  });
};

const mapFollowing = (
  items: FollowListResponse[] = [],
  topChatters: TopChatterResponse[] = [],
): AvatarRowItem[] =>
  sortByTopChatters(
    items.map((item) => ({
      userId: item.userId,
      nickname: item.nickname,
      customId: item.customId || '',
      profileImageUrl: item.followerProfileImgUrl || '',
    })),
    topChatters,
  );

const mapFollowers = (items: FollowerListResponse[] = []): AvatarRowItem[] =>
  items.map((item) => ({
    userId: item.followerId,
    nickname: item.nickname,
    customId: item.customId || '',
    profileImageUrl: item.followerProfileImgUrl || '',
  }));

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { userInfo } = useUserStore();
  const [profile, setProfile] = React.useState<UserResponse | null>(null);
  const [followingUsers, setFollowingUsers] = React.useState<AvatarRowItem[]>([]);
  const [followerUsers, setFollowerUsers] = React.useState<AvatarRowItem[]>([]);

  const followingCount = followingUsers.length;
  const followerCount = followerUsers.length;

  React.useEffect(() => {
    const loadProfileData = async () => {
      try {
        const [profileData, followList, followerList, topChatterList] = await Promise.all([
          userApi.getUserProfile(),
          followApi.getFollowList(),
          followApi.getFollowerList(),
          followApi.getTopChatters(),
        ]);

        setProfile(profileData);
        setFollowingUsers(mapFollowing(followList.data || [], topChatterList.data || []));
        setFollowerUsers(mapFollowers(followerList.data || []));
      } catch (err) {
        console.error('Failed to load profile data:', err);
      }
    };

    void loadProfileData();
  }, []);

  const handleEditClick = () => {
    navigate(PATHS.SETTINGS_PARAM.replace(':tab', 'account'));
  };

  const handleShareClick = () => {
    const myId = userInfo?.id;
    if (!myId) return;

    const shareUrl = `${window.location.origin}/${myId}`;

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast.success('프로필 링크를 클립보드에 복사했습니다.');
      })
      .catch((err) => {
        console.error('Failed to copy link:', err);
        toast.error('프로필 링크를 복사하지 못했습니다.');
      });
  };

  const handleUserClick = async (item: AvatarRowItem) => {
    try {
      const myId = userInfo?.id;

      if (myId && item.userId === myId) {
        navigate(PATHS.USER_HOME(item.userId));
        return;
      }

      if (!item.customId) {
        toast.error('사용자 정보를 확인할 수 없습니다.');
        return;
      }

      const response = await followApi.searchUsers(item.customId);
      const target = (response.data || []).find(
        (user) => user.userId === item.userId && user.customId === item.customId,
      );

      if (!target) {
        toast.error('해당 사용자를 찾을 수 없습니다.');
        return;
      }

      const canVisit = target.followStatus === 'FOLLOWING' || target.isProfilePublic === true;

      if (!canVisit) {
        toast.error('비공개 계정이라 아직 이 사용자의 집에 입장할 수 없습니다.');
        return;
      }

      navigate(PATHS.VISIT(target.userId));
    } catch (error) {
      console.error('Failed to resolve visit target:', error);
      toast.error('사용자 집 정보를 확인하지 못했습니다.');
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#FDFCFB]">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-12 px-8 py-8">
        <div className="group relative flex min-h-[340px] w-full flex-col justify-end overflow-hidden rounded-[28px] bg-[#E0D7D0] p-7 shadow-2xl shadow-gray-200/50">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="h-36 w-36 overflow-hidden rounded-full bg-white/50 shadow-2xl backdrop-blur-sm transition-transform duration-500 group-hover:scale-105">
              <img
                src={
                  profile?.userProfileImageUrl ||
                  initialsAvatarFallback(profile?.nickname || userInfo?.nickname || 'User')
                }
                alt="Profile"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="relative z-10 flex items-end justify-between gap-8">
            <div className="flex flex-col gap-2">
              <p className="text-lg font-bold tracking-tight text-gray-700/60">
                @{userInfo?.customId || 'unknown_id'}
              </p>
              <h1 className="text-4xl font-black tracking-tighter text-gray-900 drop-shadow-sm">
                {userInfo?.nickname || 'User'}
              </h1>

              <div className="my-1 flex items-center gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-500/60">팔로워</span>
                  <span className="text-lg font-black text-gray-900">{followerCount}</span>
                </div>
                <div className="h-1 w-1 flex-none rounded-full bg-gray-300" />
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-500/60">팔로우 중</span>
                  <span className="text-lg font-black text-gray-900">{followingCount}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleEditClick}
                className="flex h-8 items-center rounded-full bg-rose-500 px-5 text-sm font-bold text-white shadow-lg shadow-rose-500/30 transition-all active:scale-95 hover:bg-rose-600"
              >
                편집
              </button>
              <button
                onClick={handleShareClick}
                className="group/share flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition-all active:scale-95 hover:bg-rose-600"
                title="프로필 링크 공유"
              >
                <Share2 className="h-4 w-4 transition-colors" />
              </button>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/5 to-white/10" />
        </div>

        <div className="space-y-12 px-6">
          <AvatarRow title="팔로우 중" items={followingUsers} onUserClick={handleUserClick} />
          <AvatarRow title="팔로워" items={followerUsers} onUserClick={handleUserClick} />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
