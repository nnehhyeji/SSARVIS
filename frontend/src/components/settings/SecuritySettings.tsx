import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Lock, ShieldCheck, ChevronRight, XCircle } from 'lucide-react';
import authApi from '../../apis/authApi';
import { useVoiceLockStore } from '../../store/useVoiceLockStore';
import { toast } from '../../store/useToastStore';

interface Props {
  isSaving: boolean;
  setIsSaving: (v: boolean) => void;
  voiceLockTimeout: number | null | undefined;
  formatTime: (seconds: number | null | undefined) => string;
  onOpenRegistrationModal: () => void;
}

const TEXT = {
  status: '상태',
  phrase: '문구',
  timeout: '잠금 시간',
  enterPhrase: '잠금 문구를 먼저 입력해주세요.',
  saveSuccess: '음성 잠금 설정이 저장되었습니다.',
  saveFailed: '음성 잠금 설정 저장에 실패했습니다.',
  registerTitle: '음성 잠금 등록',
  registerDesc: '나만의 음성 잠금 문구를 등록해 AI 접근을 보호하세요.',
  register: '등록하기',
  enabledTitle: '음성 잠금 사용 중',
  currentTimeout: '현재 잠금 시간',
  enabled: '활성화',
  disabled: '비활성화',
  voiceLockState: '음성 잠금',
  phrasePlaceholder: '잠금 문구를 입력해주세요',
  phraseHelp: '이 문구는 음성 잠금 해제 시 사용됩니다.',
  currentSetting: '현재 설정',
  hour: '시간',
  minute: '분',
  saving: '저장 중...',
  saveSettings: '설정 저장',
  resetConfirm: '등록된 음성 잠금 정보를 삭제하시겠습니까?',
  resetSuccess: '음성 잠금 정보가 삭제되었습니다.',
  resetFailed: '음성 잠금 정보 삭제에 실패했습니다.',
  reset: '음성 잠금 초기화',
};

function VoiceRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="w-28 shrink-0 pt-1 text-sm font-black uppercase tracking-[0.2em] text-gray-400">
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function SecuritySettings({
  isSaving,
  setIsSaving,
  voiceLockTimeout,
  formatTime,
  onOpenRegistrationModal,
}: Props) {
  const [lockPhrase, setLockPhrase] = useState('');
  const {
    isVoiceLockRegistered,
    isVoiceLockEnabled,
    setVoiceLockEnabled,
    timeoutDuration,
    setTimeoutDuration,
    clearVoiceLock,
  } = useVoiceLockStore();

  const handleSaveSecuritySettings = async () => {
    if (!isVoiceLockRegistered) return;

    const trimmedLockPhrase = lockPhrase.trim();
    if (!trimmedLockPhrase) {
      toast.error(TEXT.enterPhrase);
      return;
    }

    setIsSaving(true);
    try {
      await authApi.setupVoiceLock({ voicePassword: trimmedLockPhrase, timeout: timeoutDuration });
      toast.success(TEXT.saveSuccess);
      setLockPhrase('');
    } catch (error) {
      console.error('Failed to save security settings:', error);
      toast.error(TEXT.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-10 pb-24">
      {!isVoiceLockRegistered ? (
        <div className="flex flex-col items-center gap-6 rounded-[32px] border-2 border-dashed border-gray-200 bg-gray-50 py-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg shadow-gray-200/50">
            <Mic className="h-8 w-8 text-[var(--color-primary)]" />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-2xl font-black text-gray-900">{TEXT.registerTitle}</h3>
            <p className="max-w-sm px-6 text-sm font-medium leading-relaxed text-gray-400">
              {TEXT.registerDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenRegistrationModal}
            className="group flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-8 py-4 text-lg font-black text-white shadow-lg transition-all hover:bg-[var(--color-primary-sub)]"
          >
            {TEXT.register}
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--color-primary)] shadow-lg">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-2xl font-black text-gray-900">{TEXT.enabledTitle}</h3>
            <p className="text-sm font-medium text-gray-400">
              {TEXT.currentTimeout}: {formatTime(voiceLockTimeout)}
            </p>
          </div>
        </div>
      )}

      {isVoiceLockRegistered && (
        <>
          <div className="h-px w-full bg-gray-100" />

          <div className="flex flex-col gap-10">
            <VoiceRow label={TEXT.status}>
              <div className="flex items-center justify-between gap-4">
                <span className="text-base font-bold text-gray-900">
                  {TEXT.voiceLockState} {isVoiceLockEnabled ? TEXT.enabled : TEXT.disabled}
                </span>
                <button
                  type="button"
                  onClick={() => setVoiceLockEnabled(!isVoiceLockEnabled)}
                  className="relative h-7 w-14 overflow-hidden rounded-full bg-gray-200"
                >
                  <motion.div
                    animate={{ backgroundColor: isVoiceLockEnabled ? 'var(--color-primary)' : '#e5e7eb' }}
                    className="absolute inset-0"
                  />
                  <motion.div
                    animate={{ x: isVoiceLockEnabled ? 32 : 4 }}
                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-md"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </VoiceRow>

            <AnimatePresence>
              {isVoiceLockEnabled && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex flex-col gap-10"
                >
                  <VoiceRow label={TEXT.phrase}>
                    <div className="flex flex-col gap-3">
                      <div className="relative max-w-2xl">
                        <input
                          type="text"
                          value={lockPhrase}
                          onChange={(event) => setLockPhrase(event.target.value)}
                          placeholder={TEXT.phrasePlaceholder}
                          className="w-full rounded-2xl border-2 bg-gray-50 px-6 py-5 text-base font-bold text-gray-900 outline-none transition-colors focus:border-[var(--color-primary)]"
                          style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 10%, white)' }}
                        />
                        <div className="absolute right-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-sm">
                          <Mic className="h-5 w-5 text-[var(--color-primary)]" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-400">{TEXT.phraseHelp}</p>
                    </div>
                  </VoiceRow>

                  <VoiceRow label={TEXT.timeout}>
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-wrap items-center gap-4">
                        {[5, 10, 30, 60].map((minutes) => (
                          <button
                            key={minutes}
                            type="button"
                            onClick={() => setTimeoutDuration(minutes * 60)}
                            className={`rounded-2xl px-8 py-4 text-lg font-black transition-all ${
                              timeoutDuration === minutes * 60
                                ? 'bg-[var(--color-primary)] text-white shadow-lg'
                                : 'border border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300'
                            }`}
                          >
                            {minutes >= 60
                              ? `${Math.floor(minutes / 60)}${TEXT.hour}`
                              : `${minutes}${TEXT.minute}`}
                          </button>
                        ))}
                      </div>
                      <p className="text-sm font-medium text-gray-400">
                        {TEXT.currentSetting}:{' '}
                        <span className="font-black text-[var(--color-primary)]">
                          {formatTime(timeoutDuration)}
                        </span>
                      </p>
                    </div>
                  </VoiceRow>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveSecuritySettings}
                      disabled={isSaving || !lockPhrase.trim()}
                      className="flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-8 py-4 text-lg font-black text-white shadow-lg transition-all hover:bg-[var(--color-primary-sub)] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                    >
                      <ShieldCheck className="h-5 w-5" />
                      {isSaving ? TEXT.saving : TEXT.saveSettings}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-center pt-8">
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(TEXT.resetConfirm)) {
                  return;
                }

                try {
                  await clearVoiceLock();
                  toast.success(TEXT.resetSuccess);
                } catch {
                  toast.error(TEXT.resetFailed);
                }
              }}
              className="flex items-center gap-2 text-sm font-black text-[var(--color-primary)] hover:text-[var(--color-primary-sub)] hover:underline"
            >
              <XCircle className="h-4 w-4" />
              {TEXT.reset}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
