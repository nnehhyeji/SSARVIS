import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Eye, MessageCircle, Timer } from 'lucide-react';
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
    setProfile((prev) => (prev ? { ...prev, isProfilePublic: !prev.isProfilePublic } : prev));
    try {
      setIsSaving(true);
      await userApi.toggleProfileVisibility();
    } catch (error) {
      console.error('Failed to toggle profile visibility:', error);
      setProfile(prevProfile);
    } finally {
      setIsSaving(false);
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">개인정보 설정</h2>
        <p className="text-gray-500 font-medium">서비스 내에서 표시되는 회원 정보를 관리합니다.</p>
      </div>

      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 space-y-8">
        {/* 프로필 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onOpenImageModal}
              className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-100 to-green-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden relative group cursor-pointer"
            >
              {profile?.userProfileImageUrl ? (
                <img
                  src={profile.userProfileImageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="flex gap-2">
                    <div className="w-1.5 h-2.5 bg-gray-800 rounded-full" />
                    <div className="w-1.5 h-2.5 bg-gray-800 rounded-full" />
                  </div>
                  <div className="w-3.5 h-2 border-b-2 border-gray-800 rounded-full mt-1" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </button>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{profile?.nickname || '사용자'}</h3>
              <p className="text-gray-400">{profile?.email || 'email@example.com'}</p>
            </div>
          </div>
          <button
            onClick={onOpenImageModal}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-2xl font-bold text-gray-600 transition-colors flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            이미지 변경
          </button>
        </div>

        <div className="space-y-4">
          {/* 닉네임 */}
          <div className="p-5 rounded-3xl border border-gray-100 bg-gray-50/30 flex flex-col gap-3 group hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Nickname
                </span>
                {!isEditingNickname ? (
                  <span className="text-lg font-bold text-gray-800">{profile?.nickname}</span>
                ) : (
                  <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    className="text-lg font-bold text-gray-800 bg-white border border-blue-200 rounded-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    autoFocus
                  />
                )}
              </div>
              {!isEditingNickname ? (
                <button
                  onClick={() => setIsEditingNickname(true)}
                  className="px-4 py-2 text-blue-500 font-bold hover:bg-blue-50 rounded-xl transition-colors"
                >
                  수정
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateProfile('nickname')}
                    className="px-4 py-2 bg-blue-500 text-white font-bold rounded-xl transition-colors"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setIsEditingNickname(false)}
                    className="px-4 py-2 text-gray-400 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 소개 */}
          <div className="p-5 rounded-3xl border border-gray-100 bg-gray-50/30 flex flex-col gap-3 group hover:border-pink-200 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex flex-col w-full mr-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Introduction
                </span>
                {!isEditingDescription ? (
                  <span className="text-lg font-bold text-gray-800">
                    {profile?.description || '한줄 소개를 입력해 주세요.'}
                  </span>
                ) : (
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="text-lg font-bold text-gray-800 bg-white border border-pink-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500/20 min-h-[80px]"
                    autoFocus
                  />
                )}
              </div>
              {!isEditingDescription ? (
                <button
                  onClick={() => setIsEditingDescription(true)}
                  className="px-4 py-2 text-pink-500 font-bold hover:bg-pink-50 rounded-xl transition-colors shrink-0"
                >
                  수정
                </button>
              ) : (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleUpdateProfile('description')}
                    className="px-4 py-2 bg-pink-500 text-white font-bold rounded-xl transition-colors"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setIsEditingDescription(false)}
                    className="px-4 py-2 text-gray-400 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    취소
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 비밀번호 */}
          <div className="p-5 rounded-3xl border border-gray-100 bg-gray-50/30 flex flex-col gap-3 group hover:border-indigo-200 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Security
                </span>
                <span className="text-lg font-bold text-gray-800">비밀번호 변경</span>
              </div>
              {!isEditingPassword ? (
                <button
                  onClick={() => setIsEditingPassword(true)}
                  className="px-4 py-2 text-indigo-500 font-bold hover:bg-indigo-50 rounded-xl transition-colors"
                >
                  수정
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingPassword(false)}
                  className="px-4 py-2 text-gray-400 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                >
                  취소
                </button>
              )}
            </div>
            <AnimatePresence>
              {isEditingPassword && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pt-2"
                >
                  <input
                    type="password"
                    placeholder="새 비밀번호 (8자 이상)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-indigo-100 border-2 rounded-xl py-3 px-4 font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-gray-300"
                  />
                  <input
                    type="password"
                    placeholder="비밀번호 확인"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white border border-indigo-100 border-2 rounded-xl py-3 px-4 font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-gray-300"
                  />
                  <button
                    onClick={() => handleUpdateProfile('password')}
                    className="w-full py-4 bg-indigo-500 text-white rounded-[20px] font-black text-lg hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                  >
                    비밀번호 업데이트
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 상태 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl border border-gray-100 bg-gray-50/50 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-pink-500" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Namna Status
                </span>
                <span className="text-sm font-bold text-gray-700 truncate">
                  {profile?.isAcceptPrompt ? '문답 받는 중' : '문답 거부 중'}
                </span>
              </div>
            </div>
            <div className="p-5 rounded-3xl border border-gray-100 bg-gray-50/50 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <Timer className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Lock Timeout
                </span>
                <span className="text-sm font-bold text-gray-700">
                  {isVoiceLockRegistered ? formatTime(profile?.voiceLockTimeout) : '미설정'}
                </span>
              </div>
            </div>
          </div>

          {/* 공개/비공개 토글 */}
          <div className="p-5 rounded-3xl border border-gray-100 bg-gray-50/30 flex flex-col gap-3 group hover:border-teal-200 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Visibility
                  </span>
                  <span className="text-lg font-bold text-gray-800">
                    {profile?.isProfilePublic ? '공개 계정' : '비공개 계정'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleProfile}
                disabled={isSaving}
                className={`w-14 h-7 rounded-full relative transition-all duration-300 outline-none ${profile?.isProfilePublic ? 'bg-teal-500' : 'bg-gray-300'}`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 ${profile?.isProfilePublic ? 'left-8' : 'left-1'}`}
                />
              </button>
            </div>
            <p className="text-xs text-gray-400 font-medium italic">
              * 비공개 계정일 경우 다른 사용자가 검색할 수 없습니다.
            </p>
          </div>

          {/* 검색용 아이디 */}
          <div className="p-5 rounded-3xl border border-gray-100 bg-gray-50/30 flex flex-col">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
              Public Link ID (검색용 아이디)
            </span>
            <span className="text-lg font-bold text-gray-800">@{profile?.customId}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-10">
        <button
          onClick={handleWithdraw}
          className="px-8 py-4 text-red-500 font-black hover:bg-red-50 rounded-[24px] transition-colors border-2 border-transparent hover:border-red-100"
        >
          회원 탈퇴하기
        </button>
      </div>
    </div>
  );
}
