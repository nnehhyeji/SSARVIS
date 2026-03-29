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
  defaultUser: '\uC0AC\uC6A9\uC790',
  empty: '\uC5C6\uC74C',
  photoAlt: '\uD504\uB85C\uD544 \uC774\uBBF8\uC9C0',
  managePhoto: '\uD504\uB85C\uD544 \uC0AC\uC9C4 \uAD00\uB9AC',
  nickname: '\uC774\uB984',
  bio: '\uC6B0\uB9AC\uC9D1 \uC18C\uAC1C',
  password: '\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD',
  visibility: '\uACC4\uC815 \uACF5\uAC1C \uBC94\uC704',
  prompts: '\uB0A8\uC774 \uBCF4\uB294 \uB098',
  voiceLock: '\uC74C\uC131 \uC7A0\uAE08',
  save: '\uC800\uC7A5',
  cancel: '\uCDE8\uC18C',
  edit: '\uC218\uC815',
  customId: '\uC0AC\uC6A9\uC790 \uC544\uC774\uB514',
  email: '\uC774\uBA54\uC77C',
  nicknameLength: '\uB2C9\uB124\uC784\uC740 2\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.',
  passwordLength: '\uBE44\uBC00\uBC88\uD638\uB294 8\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.',
  passwordMismatch: '\uBE44\uBC00\uBC88\uD638 \uD655\uC778\uC774 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
  settingsSaved: '\uC124\uC815\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.',
  saveFailed: '\uC124\uC815\uC744 \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
  saveError: '\uC124\uC815 \uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.',
  visibilityFailed: '\uACF5\uAC1C \uBC94\uC704\uB97C \uBCC0\uACBD\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
  promptFailed: '\uD504\uB86C\uD504\uD2B8 \uC218\uC9D1 \uC124\uC815\uC744 \uBCC0\uACBD\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
  withdrawConfirm:
    '\uC815\uB9D0 \uD68C\uC6D0 \uD0C8\uD1F4\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C? \uC774 \uC791\uC5C5\uC740 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.',
  withdrawSuccess: '\uD68C\uC6D0 \uD0C8\uD1F4\uAC00 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.',
  withdrawFailed: '\uD68C\uC6D0 \uD0C8\uD1F4\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.',
  withdrawError: '\uD68C\uC6D0 \uD0C8\uD1F4 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.',
  bioPlaceholder: '\uC9E7\uC740 \uC18C\uAC1C\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.',
  noBio: '\uC544\uC9C1 \uC18C\uAC1C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
  newPassword: '\uC0C8 \uBE44\uBC00\uBC88\uD638',
  confirmPassword: '\uBE44\uBC00\uBC88\uD638 \uD655\uC778',
  passwordGuide: '',
  publicAccount: '\uACF5\uAC1C \uACC4\uC815',
  privateAccount: '\uBE44\uACF5\uAC1C \uACC4\uC815',
  visibilityHelp: '\uB204\uAC00 \uB0B4 \uC9D1 \uD654\uBA74\uC5D0 \uC811\uADFC\uD560 \uC218 \uC788\uB294\uC9C0 \uC124\uC815\uD569\uB2C8\uB2E4.',
  enabled: '\uBB38\uB2F5 \uC218\uC9D1',
  disabled: '\uBE44\uD65C\uC131\uD654',
  promptHelp:
    '\uD0C0\uC778\uC758 \uC9C8\uBB38\uC744 \uBC1B\uC544 \uC751\uB2F5\uC744 \uC218\uC9D1\uD558\uACE0 AI\uB97C \uACE0\uB3C4\uD654\uD569\uB2C8\uB2E4.',
  currentSetting: '\uD604\uC7AC \uC124\uC815',
  open: '\uC5F4\uAE30',
  deleteAccount: '\uD68C\uC6D0 \uD0C8\uD1F4',
  notSet: '\uBBF8\uC124\uC815',
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
          className="rounded-xl bg-rose-500 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-600 active:scale-95"
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
                  className="rounded-xl border-2 border-rose-100 bg-gray-50 px-4 py-3 text-base font-bold text-gray-900 outline-none transition-colors focus:border-rose-500"
                  autoFocus
                />
                <div className="flex gap-3 text-sm font-black">
                  <button type="button" onClick={() => void handleUpdateProfile('nickname')} className="text-rose-500">
                    {TEXT.save}
                  </button>
                  <button type="button" onClick={() => setIsEditingNickname(false)} className="text-gray-400">
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
                  className="text-sm font-black text-rose-500 hover:underline"
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
                  <button type="button" onClick={() => void handleUpdateProfile('description')} className="text-rose-500">
                    {TEXT.save}
                  </button>
                  <button type="button" onClick={() => setIsEditingDescription(false)} className="text-gray-400">
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
                  className="shrink-0 text-sm font-black text-rose-500 hover:underline"
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
                  className="rounded-xl border-2 border-rose-100 bg-gray-50 px-4 py-3 text-sm font-bold outline-none transition-colors focus:border-rose-500"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder={TEXT.confirmPassword}
                  className="rounded-xl border-2 border-rose-100 bg-gray-50 px-4 py-3 text-sm font-bold outline-none transition-colors focus:border-rose-500"
                />
                <div className="flex gap-3 text-sm font-black">
                  <button type="button" onClick={() => void handleUpdateProfile('password')} className="text-rose-500">
                    {TEXT.save}
                  </button>
                  <button type="button" onClick={() => setIsEditingPassword(false)} className="text-gray-400">
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
                  className="text-sm font-black text-rose-500 hover:underline"
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
              className="text-sm font-black text-rose-500 hover:underline"
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
                animate={{ backgroundColor: profile?.isProfilePublic ? '#f43f5e' : '#e5e7eb' }}
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
                animate={{ backgroundColor: profile?.isAcceptPrompt ? '#f43f5e' : '#e5e7eb' }}
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
          className="border-b border-rose-500/30 pb-1 text-sm font-black text-rose-500 hover:text-rose-600"
        >
          {TEXT.deleteAccount}
        </button>
      </div>
    </div>
  );
}
