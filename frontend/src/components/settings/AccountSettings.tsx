import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import userApi from '../../apis/userApi';
import type { UserResponse, UpdateUserRequest } from '../../apis/userApi';
import { useUserStore } from '../../store/useUserStore';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../routes/paths';

interface Props {
  profile: UserResponse | null;
  isVoiceLockRegistered: boolean;
  isSaving: boolean;
  setIsSaving: (v: boolean) => void;
  setProfile: React.Dispatch<React.SetStateAction<UserResponse | null>>;
  loadProfile: () => Promise<void>;
  onOpenImageModal: () => void;
  formatTime: (seconds: number | null | undefined) => string;
}

export default function AccountSettings({
  profile,
  isVoiceLockRegistered,
  isSaving,
  setIsSaving,
  setProfile,
  loadProfile,
  onOpenImageModal,
  formatTime,
}: Props) {
  const navigate = useNavigate();
  const { logout } = useUserStore();

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  const [newNickname, setNewNickname] = useState(profile?.nickname ?? '');
  const [newDescription, setNewDescription] = useState(profile?.description ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = useCallback(
    async (type: 'nickname' | 'description' | 'password') => {
      try {
        setIsSaving(true);
        const updateData: UpdateUserRequest = {};

        if (type === 'nickname') {
          if (newNickname.length < 2) {
            alert('닉네임은 2자 이상이어야 합니다.');
            return;
          }
          updateData.nickname = newNickname;
        } else if (type === 'description') {
          updateData.description = newDescription;
        } else if (type === 'password') {
          if (newPassword.length < 8) {
            alert('비밀번호는 8자 이상이어야 합니다.');
            return;
          }
          if (newPassword !== confirmPassword) {
            alert('비밀번호가 일치하지 않습니다.');
            return;
          }
          updateData.password = newPassword;
        }

        await userApi.updateUserProfile(updateData);
        alert('변경 사항이 저장되었습니다.');
        setIsEditingNickname(false);
        setIsEditingDescription(false);
        setIsEditingPassword(false);
        setNewPassword('');
        setConfirmPassword('');
        loadProfile();
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          alert(error.response?.data?.message || '수정 중 오류가 발생했습니다.');
        } else {
          alert('수정 중 오류가 발생했습니다.');
        }
      } finally {
        setIsSaving(false);
      }
    },
    [newNickname, newDescription, newPassword, confirmPassword, loadProfile, setIsSaving],
  );

  const handleToggleProfile = async () => {
    if (isSaving) return;
    const prevProfile = profile;
    const nextIsPublic = !profile?.isProfilePublic;
    setProfile((prev) => (prev ? { ...prev, isProfilePublic: nextIsPublic } : prev));
    try {
      setIsSaving(true);
      await userApi.toggleProfileVisibility(nextIsPublic);
    } catch (error) {
      console.error('Failed to toggle profile visibility:', error);
      setProfile(prevProfile);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePersonaCollection = async () => {
    if (isSaving) return;
    const prevProfile = profile;
    setProfile((prev) => (prev ? { ...prev, isAcceptPrompt: !prev.isAcceptPrompt } : prev));
    try {
      setIsSaving(true);
      await userApi.toggleNamna();
    } catch (error) {
      console.error('Failed to toggle persona collection:', error);
      setProfile(prevProfile);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWithdraw = async () => {
    if (
      window.confirm(
        '정말로 탈퇴하시겠습니까?\n탈퇴 시 모든 데이터가 삭제되며, 동일한 이메일로의 재가입이 불가능합니다.',
      )
    ) {
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

  return (
    <div className="flex flex-col gap-12 w-full pb-32">
      {/* 1. 프로필 섹션 */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-8">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-gray-100">
            <img
              src={profile?.userProfileImageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.nickname || 'user'}`}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">{profile?.nickname}</h2>
            <p className="text-gray-400 font-bold text-lg">ID: @{profile?.customId || 'unknown'}</p>
            <p className="text-gray-400 font-bold text-lg">EMAIL: {profile?.email}</p>
          </div>
        </div>
        <button
          onClick={onOpenImageModal}
          className="px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl shadow-lg shadow-rose-500/20 transition-all active:scale-95"
        >
          이미지 변경
        </button>
      </div>

      <div className="h-px w-full bg-gray-100" />

      {/* 2. 상세 설정 리스트 */}
      <div className="flex flex-col gap-12">
        {/* 닉네임 */}
        <div className="flex items-start justify-between">
          <div className="w-32 text-lg font-black text-gray-400 uppercase tracking-widest pt-1">닉네임</div>
          <div className="flex-1 flex justify-between items-center pl-10">
            {isEditingNickname ? (
              <div className="flex flex-col gap-2 w-full max-w-md">
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  className="text-[18px] font-black text-gray-900 bg-gray-50 rounded-xl px-4 py-3 outline-none border-2 border-rose-100 focus:border-rose-500 transition-all leading-tight"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateProfile('nickname')} className="text-sm text-rose-500 font-black">저장</button>
                  <button onClick={() => setIsEditingNickname(false)} className="text-sm text-gray-400 font-black pl-2">취소</button>
                </div>
              </div>
            ) : (
              <span className="text-[18px] font-black text-gray-900 leading-tight">{profile?.nickname}</span>
            )}
            {!isEditingNickname && (
              <button onClick={() => setIsEditingNickname(true)} className="text-rose-500 font-black hover:underline underline-offset-4 text-sm">편집</button>
            )}
          </div>
        </div>

        {/* 소개 */}
        <div className="flex items-start justify-between">
          <div className="w-32 text-lg font-black text-gray-400 uppercase tracking-widest pt-1">소개</div>
          <div className="flex-1 flex flex-col gap-4 pl-10">
            {isEditingDescription ? (
              <div className="flex flex-col gap-4 w-full">
                <div className="relative">
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full text-[18px] font-black text-gray-900 bg-gray-100 rounded-3xl px-8 py-8 outline-none min-h-[160px] resize-none border-none placeholder:text-gray-300 leading-tight"
                    maxLength={255}
                    placeholder="자신을 자유롭게 소개해 주세요."
                  />
                  <span className="absolute bottom-6 right-8 text-xl font-bold text-gray-400">
                    {newDescription.length}/255
                  </span>
                </div>
                <div className="flex gap-6">
                  <button
                    onClick={() => handleUpdateProfile('description')}
                    className="text-rose-500 font-black text-sm"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setIsEditingDescription(false)}
                    className="text-gray-400 font-black text-sm"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start w-full">
                <p className="text-[18px] font-black text-gray-900 leading-tight max-w-2xl">
                  {profile?.description || '소개가 없습니다.'}
                </p>
                <button
                  onClick={() => setIsEditingDescription(true)}
                  className="text-rose-500 font-black hover:underline underline-offset-4 text-sm whitespace-nowrap"
                >
                  편집
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 비밀번호 변경 */}
        <div className="flex items-start justify-between">
          <div className="w-32 text-lg font-black text-gray-400 uppercase tracking-widest pt-1 whitespace-nowrap">비밀번호 변경</div>
          <div className="flex-1 flex flex-col gap-4 pl-10">
            {isEditingPassword ? (
              <div className="flex flex-col gap-4 w-full max-w-md">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호"
                  className="bg-gray-50 rounded-xl px-4 py-3 outline-none border-2 border-rose-100 focus:border-rose-500 font-bold"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호 확인"
                  className="bg-gray-50 rounded-xl px-4 py-3 outline-none border-2 border-rose-100 focus:border-rose-500 font-bold"
                />
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateProfile('password')} className="text-sm text-rose-500 font-black">저장</button>
                  <button onClick={() => setIsEditingPassword(false)} className="text-sm text-gray-400 font-black pl-2">취소</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center w-full">
                <div className="w-4 h-4" /> {/* Spacer */}
                <button onClick={() => setIsEditingPassword(true)} className="text-sm text-rose-500 font-black hover:underline underline-offset-4">편집</button>
              </div>
            )}
          </div>
        </div>

        {/* 계정 공개 범위 */}
        <div className="flex items-center justify-between">
          <div className="w-32 text-lg font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">계정 공개 범위</div>
          <div className="flex-1 pl-10 flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-[18px] font-black text-gray-900 leading-none">공개 계정</span>
              <p className="text-sm font-bold text-gray-400">검색 아이디를 통해 타인이 나를 찾을 수 있습니다.</p>
            </div>
            <button
              onClick={handleToggleProfile}
              className="w-14 h-7 rounded-full relative transition-all duration-300 bg-gray-200 overflow-hidden"
            >
              <motion.div
                animate={{
                  backgroundColor: profile?.isProfilePublic ? '#f43f5e' : '#e5e7eb',
                }}
                className="absolute inset-0"
              />
              <motion.div
                animate={{
                  x: profile?.isProfilePublic ? 32 : 4,
                }}
                className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md z-10"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>

        {/* 남이 보는 나 */}
        <div className="flex items-center justify-between">
          <div className="w-32 text-lg font-black text-gray-400 uppercase tracking-widest pt-1 whitespace-nowrap">남이 보는 나</div>
          <div className="flex-1 pl-10 flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-[18px] font-black text-gray-900 leading-none">문답 수집</span>
              <p className="text-sm font-bold text-gray-400">타인의 질문을 받아 응답을 수집하고 AI를 고도화합니다.</p>
            </div>
            <button
              onClick={handleTogglePersonaCollection}
              className="w-14 h-7 rounded-full relative transition-all duration-300 bg-gray-200 overflow-hidden"
            >
              <motion.div
                animate={{
                  backgroundColor: profile?.isAcceptPrompt ? '#f43f5e' : '#e5e7eb',
                }}
                className="absolute inset-0"
              />
              <motion.div
                animate={{
                  x: profile?.isAcceptPrompt ? 32 : 4,
                }}
                className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md z-10"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>

        {/* 음성 잠금 */}
        <div className="flex items-center justify-between">
          <div className="w-32 text-lg font-black text-gray-400 uppercase tracking-widest pt-1 whitespace-nowrap">음성 잠금</div>
          <div className="flex-1 pl-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[18px] font-black text-gray-900 leading-tight">사용중</span>
              <span className="text-sm font-bold text-gray-400">{isVoiceLockRegistered ? formatTime(profile?.voiceLockTimeout) : '미설정'}</span>
            </div>
            <button
              onClick={() => navigate(PATHS.SETTINGS_PARAM.replace(':tab', 'voice'))}
              className="text-rose-500 font-black hover:underline underline-offset-4 text-sm"
            >
              설정
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-center pt-20">
        <button
          onClick={handleWithdraw}
          className="text-sm font-black text-rose-500 hover:text-rose-600 border-b border-rose-500/30 pb-1"
        >
          회원탈퇴
        </button>
      </div>
    </div>
  );
}
