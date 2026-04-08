import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';

import followApi from '../apis/followApi';
import userApi from '../apis/userApi';
import ProfilePage from '../pages/profile/ProfilePage';
import { useUserStore } from '../store/useUserStore';

const mockProfile = {
  id: 7,
  email: 'ssarvis@example.com',
  nickname: 'Hyeji',
  customId: 'hyeji',
  description: 'Profile page story mock',
  userProfileImageUrl: '',
  isVoiceLockActive: false,
  isAcceptPrompt: true,
  isProfilePublic: true,
  viewCount: 1284,
  voiceLockTimeout: 30,
};

const mockFollowing = [
  {
    followId: 1,
    userId: 11,
    nickname: 'Minsu',
    customId: 'minsu',
    followerProfileImgUrl: '',
    description: 'Following user',
  },
  {
    followId: 2,
    userId: 12,
    nickname: 'Jiwoo',
    customId: 'jiwoo',
    followerProfileImgUrl: '',
    description: 'Following user',
  },
];

const mockFollowers = [
  {
    followId: 3,
    followerId: 21,
    nickname: 'Seoyeon',
    customId: 'seoyeon',
    followerProfileImgUrl: '',
    description: 'Follower user',
  },
  {
    followId: 4,
    followerId: 22,
    nickname: 'Doyun',
    customId: 'doyun',
    followerProfileImgUrl: '',
    description: 'Follower user',
  },
  {
    followId: 5,
    followerId: 23,
    nickname: 'Hajun',
    customId: 'hajun',
    followerProfileImgUrl: '',
    description: 'Follower user',
  },
];

const mockTopChatters = [
  {
    userId: 12,
    nickname: 'Jiwoo',
    profileImageUrl: '',
    totalMessageCount: 42,
  },
  {
    userId: 11,
    nickname: 'Minsu',
    profileImageUrl: '',
    totalMessageCount: 25,
  },
];

const originalGetUserProfile = userApi.getUserProfile;
const originalGetFollowList = followApi.getFollowList;
const originalGetFollowerList = followApi.getFollowerList;
const originalGetTopChatters = followApi.getTopChatters;
const originalSearchUsers = followApi.searchUsers;

useUserStore.setState({
  hasHydrated: true,
  isLoggedIn: true,
  userInfo: {
    id: mockProfile.id,
    email: mockProfile.email,
    nickname: mockProfile.nickname,
    customId: mockProfile.customId,
  },
});

userApi.getUserProfile = async () => mockProfile;
followApi.getFollowList = async () => ({
  code: null,
  message: 'ok',
  data: mockFollowing,
});
followApi.getFollowerList = async () => ({
  code: null,
  message: 'ok',
  data: mockFollowers,
});
followApi.getTopChatters = async () => ({
  code: null,
  message: 'ok',
  data: mockTopChatters,
});
followApi.searchUsers = async () => ({
  code: null,
  message: 'ok',
  data: [
    ...mockFollowing.map((item) => ({
      userId: item.userId,
      customId: item.customId,
      nickname: item.nickname,
      email: `${item.customId}@example.com`,
      profileImageUrl: item.followerProfileImgUrl,
      followStatus: 'FOLLOWING' as const,
      isProfilePublic: true,
      isFollower: false,
    })),
    ...mockFollowers.map((item) => ({
      userId: item.followerId,
      customId: item.customId,
      nickname: item.nickname,
      email: `${item.customId}@example.com`,
      profileImageUrl: item.followerProfileImgUrl,
      followStatus: 'FOLLOWING' as const,
      isProfilePublic: true,
      isFollower: true,
    })),
  ],
});

const meta = {
  title: 'Pages/ProfilePage',
  component: ProfilePage,
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/profile']}>
        <div style={{ minHeight: '100vh', background: '#fdfcfb' }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof ProfilePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async () => {
    userApi.getUserProfile = originalGetUserProfile;
    followApi.getFollowList = originalGetFollowList;
    followApi.getFollowerList = originalGetFollowerList;
    followApi.getTopChatters = originalGetTopChatters;
    followApi.searchUsers = originalSearchUsers;

    userApi.getUserProfile = async () => mockProfile;
    followApi.getFollowList = async () => ({
      code: null,
      message: 'ok',
      data: mockFollowing,
    });
    followApi.getFollowerList = async () => ({
      code: null,
      message: 'ok',
      data: mockFollowers,
    });
    followApi.getTopChatters = async () => ({
      code: null,
      message: 'ok',
      data: mockTopChatters,
    });
    followApi.searchUsers = async () => ({
      code: null,
      message: 'ok',
      data: [
        ...mockFollowing.map((item) => ({
          userId: item.userId,
          customId: item.customId,
          nickname: item.nickname,
          email: `${item.customId}@example.com`,
          profileImageUrl: item.followerProfileImgUrl,
          followStatus: 'FOLLOWING' as const,
          isProfilePublic: true,
          isFollower: false,
        })),
        ...mockFollowers.map((item) => ({
          userId: item.followerId,
          customId: item.customId,
          nickname: item.nickname,
          email: `${item.customId}@example.com`,
          profileImageUrl: item.followerProfileImgUrl,
          followStatus: 'FOLLOWING' as const,
          isProfilePublic: true,
          isFollower: true,
        })),
      ],
    });
  },
};
