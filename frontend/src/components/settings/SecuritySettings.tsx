import { motion } from 'framer-motion';
import { Mic, Lock, Timer, Edit3, RefreshCw, ShieldCheck, ChevronRight } from 'lucide-react';
import authApi from '../../apis/authApi';
import { useVoiceLockStore } from '../../store/useVoiceLockStore';

interface Props {
  isSaving: boolean;
  setIsSaving: (v: boolean) => void;
  voiceLockTimeout: number | null | undefined;
  formatTime: (seconds: number | null | undefined) => string;
  onOpenRegistrationModal: () => void;
}

export default function SecuritySettings({
  isSaving,
  setIsSaving,
  voiceLockTimeout,
  formatTime,
  onOpenRegistrationModal,
}: Props) {
  const {
    isVoiceLockRegistered,
    isVoiceLockEnabled,
    setVoiceLockEnabled,
    lockPhrase,
    setLockPhrase,
    timeoutDuration,
    setTimeoutDuration,
    clearVoiceLock,
  } = useVoiceLockStore();

  const handleSaveSecuritySettings = async () => {
    if (!isVoiceLockRegistered) return;
    setIsSaving(true);
    try {
      await authApi.setupVoiceLock({ voicePassword: lockPhrase, timeout: timeoutDuration });
      alert('보안 설정이 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save security settings:', error);
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">보안 설정</h2>
        <p className="text-gray-500 font-medium">
          서비스 사용 중 개인정보 보호를 위한 잠금 기능을 관리합니다.
        </p>
      </div>

      {!isVoiceLockRegistered ? (
        <div className="bg-white rounded-[40px] p-12 shadow-sm border border-gray-100 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center">
            <Mic className="w-10 h-10 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">음성 잠금 등록</h3>
            <p className="text-gray-400 font-medium max-w-sm">
              나의 목소리로 보안을 강화하세요. <br />
              지정한 문장을 말하여 잠금을 해제할 수 있습니다.
            </p>
          </div>
          <button
            onClick={onOpenRegistrationModal}
            className="mt-4 px-10 py-5 bg-indigo-500 text-white rounded-[24px] font-black text-xl shadow-xl shadow-indigo-100 hover:bg-indigo-600 transition-all active:scale-95 flex items-center gap-2 group"
          >
            <Mic className="w-6 h-6" />
            <span>음성 잠금 등록하기</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 flex flex-col gap-10">
            <div className="flex items-center justify-between">
              <div className="flex gap-5">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <Lock className="w-7 h-7 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">이중잠금 음성잠금</h3>
                  <p className="text-gray-400 font-medium leading-relaxed">
                    지정한 시간 동안 활동이 없으면 화면이 잠기고 음성으로 해제합니다.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">
                      현재 설정: {formatTime(voiceLockTimeout)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setVoiceLockEnabled(!isVoiceLockEnabled)}
                className={`w-16 h-8 rounded-full relative transition-all duration-300 outline-none ${isVoiceLockEnabled ? 'bg-indigo-500' : 'bg-gray-200'}`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${isVoiceLockEnabled ? 'left-9' : 'left-1'}`}
                />
              </button>
            </div>

            {isVoiceLockEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-8 pt-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-3xl bg-gray-50/50 border border-gray-100 space-y-4">
                    <div className="flex items-center gap-2 text-indigo-500 font-black text-sm uppercase tracking-wider">
                      <Mic className="w-4 h-4" />
                      <span>잠금 해제 음성</span>
                    </div>
                    <div className="relative group">
                      <input
                        type="text"
                        value={lockPhrase}
                        onChange={(e) => setLockPhrase(e.target.value)}
                        className="w-full bg-white border border-gray-100 rounded-2xl py-4 px-5 font-bold text-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                      <Edit3 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 pointer-events-none" />
                    </div>
                    <p className="text-xs text-gray-400 font-medium italic">
                      * 현재 등록된 문장입니다.
                    </p>
                  </div>

                  <div className="p-6 rounded-3xl bg-gray-50/50 border border-gray-100 space-y-4">
                    <div className="flex items-center gap-2 text-indigo-500 font-black text-sm uppercase tracking-wider">
                      <Timer className="w-4 h-4" />
                      <span>자동 잠금 시간</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {[5, 10, 30, 60].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => setTimeoutDuration(mins * 60)}
                          className={`flex-1 py-4 px-2 rounded-2xl font-black transition-all text-sm ${timeoutDuration === mins * 60 ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-100'}`}
                        >
                          {mins >= 60 ? `${Math.floor(mins / 60)}시간` : `${mins}분`}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 font-medium italic">
                      *{' '}
                      {timeoutDuration >= 3600
                        ? `${Math.floor(timeoutDuration / 3600)}시간`
                        : `${Math.floor(timeoutDuration / 60)}분`}{' '}
                      동안 활동이 없으면 자동으로 잠깁니다.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveSecuritySettings}
                    disabled={isSaving}
                    className="px-8 py-4 bg-indigo-500 text-white rounded-2xl font-black text-lg hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-indigo-100 disabled:bg-gray-200 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-5 h-5" />
                    )}
                    <span>{isSaving ? '저장 중...' : '설정 저장하기'}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={async () => {
                if (
                  window.confirm(
                    '정말로 음성 정보를 삭제하시겠습니까? 음성 잠금 기능이 비활성화됩니다.',
                  )
                ) {
                  try {
                    await clearVoiceLock();
                    alert('음성 정보가 삭제되었습니다.');
                  } catch {
                    alert('삭제 중 오류가 발생했습니다.');
                  }
                }
              }}
              className="text-gray-400 hover:text-red-400 underline text-sm transition-colors"
            >
              음성 정보 삭제 후 재등록하기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
