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
  status: '\uC0C1\uD0DC',
  phrase: '\uBB38\uAD6C',
  timeout: '\uC7A0\uAE08 \uC2DC\uAC04',
  enterPhrase: '\uC7A0\uAE08 \uBB38\uAD6C\uB97C \uBA3C\uC800 \uC785\uB825\uD574\uC8FC\uC138\uC694.',
  saveSuccess:
    '\uC74C\uC131 \uC7A0\uAE08 \uC124\uC815\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.',
  saveFailed:
    '\uC74C\uC131 \uC7A0\uAE08 \uC124\uC815 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.',
  registerTitle: '\uC74C\uC131 \uC7A0\uAE08 \uB4F1\uB85D',
  registerDesc:
    '\uB098\uB9CC\uC758 \uC74C\uC131 \uC7A0\uAE08 \uBB38\uAD6C\uB97C \uB4F1\uB85D\uD574 AI \uC811\uADFC\uC744 \uBCF4\uD638\uD558\uC138\uC694.',
  register: '\uB4F1\uB85D\uD558\uAE30',
  enabledTitle: '\uC74C\uC131 \uC7A0\uAE08 \uC0AC\uC6A9 \uC911',
  currentTimeout: '\uD604\uC7AC \uC7A0\uAE08 \uC2DC\uAC04',
  enabled: '\uD65C\uC131\uD654',
  disabled: '\uBE44\uD65C\uC131\uD654',
  voiceLockState: '\uC74C\uC131 \uC7A0\uAE08',
  phrasePlaceholder: '\uC7A0\uAE08 \uBB38\uAD6C\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694',
  phraseHelp:
    '\uC774 \uBB38\uAD6C\uB294 \uC74C\uC131 \uC7A0\uAE08 \uD574\uC81C \uC2DC \uC0AC\uC6A9\uB429\uB2C8\uB2E4.',
  currentSetting: '\uD604\uC7AC \uC124\uC815',
  hour: '\uC2DC\uAC04',
  minute: '\uBD84',
  saving: '\uC800\uC7A5 \uC911...',
  saveSettings: '\uC124\uC815 \uC800\uC7A5',
  resetConfirm:
    '\uB4F1\uB85D\uB41C \uC74C\uC131 \uC7A0\uAE08 \uC815\uBCF4\uB97C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?',
  resetSuccess:
    '\uC74C\uC131 \uC7A0\uAE08 \uC815\uBCF4\uAC00 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.',
  resetFailed:
    '\uC74C\uC131 \uC7A0\uAE08 \uC815\uBCF4 \uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.',
  reset: '\uC74C\uC131 \uC7A0\uAE08 \uCD08\uAE30\uD654',
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
            <Mic className="h-8 w-8 text-rose-500" />
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
            className="group flex items-center gap-2 rounded-2xl bg-rose-500 px-8 py-4 text-lg font-black text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-600"
          >
            {TEXT.register}
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500 shadow-lg shadow-rose-500/20">
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
                    animate={{ backgroundColor: isVoiceLockEnabled ? '#f43f5e' : '#e5e7eb' }}
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
                          className="w-full rounded-2xl border-2 border-rose-50 bg-gray-50 px-6 py-5 text-base font-bold text-gray-900 outline-none transition-colors focus:border-rose-500"
                        />
                        <div className="absolute right-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-sm">
                          <Mic className="h-5 w-5 text-rose-500" />
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
                                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
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
                        <span className="font-black text-rose-500">
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
                      className="flex items-center gap-2 rounded-2xl bg-rose-500 px-8 py-4 text-lg font-black text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
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
              className="flex items-center gap-2 text-sm font-black text-rose-500 hover:underline"
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
