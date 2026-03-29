import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import userApi from '../../apis/userApi';
import type { UserResponse, UpdateUserRequest } from '../../apis/userApi';
import { useUserStore } from '../../store/useUserStore';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../routes/paths';
import { toast } from '../../store/useToastStore';
import { initialsAvatarFallback } from '../../utils/avatar';

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

const TEXT = {
  defaultUser: '사용자',
  empty: '없음',
  photoAlt: '프로필 이미지',
  managePhoto: '프로필 사진 관리',
  nickname: '이름',
  bio: '우리집 소개',
  password: '비밀번호 변경',
  visibility: '계정 공개 범위',
  prompts: '남이 보는 나',
  voiceLock: '음성 잠금',
  save: '저장',
  cancel: '취소',
  edit: '수정',
  customId: '사용자 아이디',
  email: '이메일',
  nicknameLength: '닉네임은 2자 이상이어야 합니다.',
  passwordLength: '비밀번호는 8자 이상이어야 합니다.',
  passwordMismatch: '비밀번호 확인이 일치하지 않습니다.',
  settingsSaved: '설정이 저장되었습니다.',
  saveFailed: '설정을 저장하지 못했습니다.',
  saveError: '설정 저장 중 오류가 발생했습니다.',
  visibilityFailed: '공개 범위를 변경하지 못했습니다.',
  promptFailed: '프롬프트 수집 설정을 변경하지 못했습니다.',
  withdrawConfirm:
    '정말 회원 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
  withdrawSuccess: '회원 탈퇴가 완료되었습니다.',
  withdrawFailed: '회원 탈퇴에 실패했습니다.',
  withdrawError: '회원 탈퇴 중 오류가 발생했습니다.',
  bioPlaceholder: '짧은 소개를 입력해주세요.',
  noBio: '아직 소개가 없습니다.',
  newPassword: '새 비밀번호',
  confirmPassword: '비밀번호 확인',
  passwordGuide: '',
  publicAccount: '공개 계정',
  privateAccount: '비공개 계정',
  visibilityHelp: '누가 내 집 화면에 접근할 수 있는지 설정합니다.',
  enabled: '문답 수집',
  disabled: '비활성화',
  promptHelp: '타인의 질문을 받아 응답을 수집하고 AI를 고도화합니다.',
  currentSetting: '현재 설정',
  open: '열기',
  deleteAccount: '회원 탈퇴',
  notSet: '미설정',
};

function SectionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="w-28 shrink-0 pt-1 text-sm font-black uppercase tracking-[0.2em] text-gray-400">
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
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

  const [newNickname, setNewNickname] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setNewNickname(profile?.nickname ?? '');
    setNewDescription(profile?.description ?? '');
  }, [profile?.description, profile?.nickname]);

  const handleUpdateProfile = useCallback(
    async (type: 'nickname' | 'description' | 'password') => {
      try {
        setIsSaving(true);
        const updateData: UpdateUserRequest = {};

        if (type === 'nickname') {
          if (newNickname.trim().length < 2) {
            toast.error(TEXT.nicknameLength);
            return;
          }
          updateData.nickname = newNickname.trim();
        }

        if (type === 'description') {
          updateData.description = newDescription.trim();
        }

        if (type === 'password') {
          if (newPassword.length < 8) {
            toast.error(TEXT.passwordLength);
            return;
          }
          if (newPassword !== confirmPassword) {
            toast.error(TEXT.passwordMismatch);
            return;
          }
          updateData.password = newPassword;
        }

        await userApi.updateUserProfile(updateData);
        await loadProfile();

        toast.success(TEXT.settingsSaved);
        setIsEditingNickname(false);
        setIsEditingDescription(false);
        setIsEditingPassword(false);
        setNewPassword('');
        setConfirmPassword('');
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          toast.error(TEXT.saveFailed, error.response?.data?.message);
        } else {
          toast.error(TEXT.saveError);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [confirmPassword, loadProfile, newDescription, newNickname, newPassword, setIsSaving],
  );

  const handleToggleProfile = async () => {
    if (!profile || isSaving) return;

    const nextIsPublic = !profile.isProfilePublic;
    setProfile((prev) => (prev ? { ...prev, isProfilePublic: nextIsPublic } : prev));

    try {
      setIsSaving(true);
      await userApi.toggleProfileVisibility(nextIsPublic);
    } catch (error) {
      console.error('Failed to toggle profile visibility:', error);
      setProfile(profile);
      toast.error(TEXT.visibilityFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePersonaCollection = async () => {
    if (!profile || isSaving) return;

    const previousProfile = profile;
    setProfile((prev) => (prev ? { ...prev, isAcceptPrompt: !prev.isAcceptPrompt } : prev));

    try {
      setIsSaving(true);
      await userApi.toggleNamna();
    } catch (error) {
      console.error('Failed to toggle persona collection:', error);
      setProfile(previousProfile);
      toast.error(TEXT.promptFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm(TEXT.withdrawConfirm)) {
      return;
    }

    try {
      await userApi.withdraw();
      toast.success(TEXT.withdrawSuccess);
      logout();
      navigate(PATHS.LOGIN);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(TEXT.withdrawFailed, error.response?.data?.message);
      } else {
        toast.error(TEXT.withdrawError);
      }
    }
  };

  return (
    <div className="flex w-full flex-col gap-10 pb-24">
      <div className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-lg">
            <img
              src={
                profile?.userProfileImageUrl ||
                initialsAvatarFallback(profile?.nickname || TEXT.defaultUser)
              }
              alt={TEXT.photoAlt}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="text-3xl font-black tracking-tight text-gray-900">
              {profile?.nickname || TEXT.defaultUser}
            </h2>
            <p className="text-base font-medium text-gray-500">
              {TEXT.customId} : {profile?.customId || TEXT.empty}
            </p>
            <p className="text-base font-medium text-gray-500">
              {TEXT.email} : {profile?.email || TEXT.empty}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenImageModal}
          className="rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:bg-[var(--color-primary-sub)] active:scale-95"
        >
          {TEXT.managePhoto}
        </button>
      </div>

      <div className="h-px w-full bg-gray-100" />

      <div className="flex flex-col gap-10">
        <SectionRow label={TEXT.nickname}>
          <div className="flex items-start justify-between gap-4">
            {isEditingNickname ? (
              <div className="flex w-full max-w-md flex-col gap-2">
                <input
                  type="text"
                  value={newNickname}
                  onChange={(event) => setNewNickname(event.target.value)}
                  className="rounded-xl border-2 bg-gray-50 px-4 py-3 text-base font-bold text-gray-900 outline-none transition-colors focus:border-[var(--color-primary)]"
                  style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 16%, white)' }}
                  autoFocus
                />
                <div className="flex gap-3 text-sm font-black">
                  <button
                    type="button"
                    onClick={() => void handleUpdateProfile('nickname')}
                    className="text-[var(--color-primary)]"
                  >
                    {TEXT.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingNickname(false)}
                    className="text-gray-400"
                  >
                    {TEXT.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="text-base font-bold text-gray-900">{profile?.nickname}</span>
                <button
                  type="button"
                  onClick={() => setIsEditingNickname(true)}
                  className="text-sm font-black text-[var(--color-primary)] hover:text-[var(--color-primary-sub)] hover:underline"
                >
                  {TEXT.edit}
                </button>
              </>
            )}
          </div>
        </SectionRow>

        <SectionRow label={TEXT.bio}>
          <div className="flex items-start justify-between gap-4">
            {isEditingDescription ? (
              <div className="flex w-full flex-col gap-3">
                <div className="relative max-w-2xl">
                  <textarea
                    value={newDescription}
                    onChange={(event) => setNewDescription(event.target.value)}
                    className="min-h-[140px] w-full resize-none rounded-[24px] bg-gray-100 px-6 py-6 text-base font-bold text-gray-900 outline-none"
                    maxLength={255}
                    placeholder={TEXT.bioPlaceholder}
                  />
                  <span className="absolute bottom-5 right-6 text-sm font-bold text-gray-400">
                    {newDescription.length}/255
                  </span>
                </div>
                <div className="flex gap-3 text-sm font-black">
                  <button
                    type="button"
                    onClick={() => void handleUpdateProfile('description')}
                    className="text-[var(--color-primary)]"
                  >
                    {TEXT.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingDescription(false)}
                    className="text-gray-400"
                  >
                    {TEXT.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="max-w-2xl text-base font-bold leading-relaxed text-gray-900">
                  {profile?.description || TEXT.noBio}
                </p>
                <button
                  type="button"
                  onClick={() => setIsEditingDescription(true)}
                  className="shrink-0 text-sm font-black text-[var(--color-primary)] hover:text-[var(--color-primary-sub)] hover:underline"
                >
                  {TEXT.edit}
                </button>
              </>
            )}
          </div>
        </SectionRow>

        <SectionRow label={TEXT.password}>
          <div className="flex items-start justify-between gap-4">
            {isEditingPassword ? (
              <div className="flex w-full max-w-md flex-col gap-3">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder={TEXT.newPassword}
                  className="rounded-xl border-2 bg-gray-50 px-4 py-3 text-sm font-bold outline-none transition-colors focus:border-[var(--color-primary)]"
                  style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 16%, white)' }}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder={TEXT.confirmPassword}
                  className="rounded-xl border-2 bg-gray-50 px-4 py-3 text-sm font-bold outline-none transition-colors focus:border-[var(--color-primary)]"
                  style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 16%, white)' }}
                />
                <div className="flex gap-3 text-sm font-black">
                  <button
                    type="button"
                    onClick={() => void handleUpdateProfile('password')}
                    className="text-[var(--color-primary)]"
                  >
                    {TEXT.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingPassword(false)}
                    className="text-gray-400"
                  >
                    {TEXT.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="text-base font-bold text-gray-900" />
                <button
                  type="button"
                  onClick={() => setIsEditingPassword(true)}
                  className="text-sm font-black text-[var(--color-primary)] hover:text-[var(--color-primary-sub)] hover:underline"
                >
                  {TEXT.edit}
                </button>
              </>
            )}
          </div>
        </SectionRow>

        <SectionRow label={TEXT.voiceLock}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-gray-900">{TEXT.currentSetting}</span>
              <span className="text-sm font-medium text-gray-400">
                {isVoiceLockRegistered ? formatTime(profile?.voiceLockTimeout) : TEXT.notSet}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate(PATHS.SETTINGS_PARAM.replace(':tab', 'voice'))}
              className="text-sm font-black text-[var(--color-primary)] hover:text-[var(--color-primary-sub)] hover:underline"
            >
              {TEXT.open}
            </button>
          </div>
        </SectionRow>

        <SectionRow label={TEXT.visibility}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-base font-bold text-gray-900">
                {profile?.isProfilePublic ? TEXT.publicAccount : TEXT.privateAccount}
              </span>
              <p className="text-sm font-medium text-gray-400">{TEXT.visibilityHelp}</p>
            </div>
            <button
              type="button"
              onClick={handleToggleProfile}
              className="relative h-7 w-14 overflow-hidden rounded-full bg-gray-200"
            >
              <motion.div
                animate={{ backgroundColor: profile?.isProfilePublic ? 'var(--color-primary)' : '#e5e7eb' }}
                className="absolute inset-0"
              />
              <motion.div
                animate={{ x: profile?.isProfilePublic ? 32 : 4 }}
                className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-md"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </SectionRow>

        <SectionRow label={TEXT.prompts}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-base font-bold text-gray-900">
                {profile?.isAcceptPrompt ? TEXT.enabled : TEXT.disabled}
              </span>
              <p className="text-sm font-medium text-gray-400">{TEXT.promptHelp}</p>
            </div>
            <button
              type="button"
              onClick={handleTogglePersonaCollection}
              className="relative h-7 w-14 overflow-hidden rounded-full bg-gray-200"
            >
              <motion.div
                animate={{ backgroundColor: profile?.isAcceptPrompt ? 'var(--color-primary)' : '#e5e7eb' }}
                className="absolute inset-0"
              />
              <motion.div
                animate={{ x: profile?.isAcceptPrompt ? 32 : 4 }}
                className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-md"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </SectionRow>
      </div>

      <div className="flex justify-center pt-8">
        <button
          type="button"
          onClick={handleWithdraw}
          className="border-b pb-1 text-sm font-black text-[var(--color-primary)] hover:text-[var(--color-primary-sub)]"
          style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)' }}
        >
          {TEXT.deleteAccount}
        </button>
      </div>
    </div>
  );
}
