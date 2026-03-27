import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Lock, ShieldCheck, ChevronRight, XCircle } from 'lucide-react';
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
      alert('해제 문구를 입력해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      await authApi.setupVoiceLock({ voicePassword: trimmedLockPhrase, timeout: timeoutDuration });
      alert('보안 설정이 저장되었습니다.');
      setLockPhrase('');
    } catch (error) {
      console.error('Failed to save security settings:', error);
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-12 w-full pb-32">
      {/* 등록 상태에 따른 헤더 */}
      {!isVoiceLockRegistered ? (
        <div className="flex flex-col gap-8 py-10 items-center text-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-xl shadow-gray-200/50">
            <Mic className="w-10 h-10 text-rose-500" />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-3xl font-black text-gray-900">음성 잠금 등록</h3>
            <p className="text-gray-400 font-bold max-w-sm px-6">
              나의 목소리로 보안을 강화하세요.
              <br />
              정해진 문장을 말하여 잠금을 해제합니다.
            </p>
          </div>
          <button
            onClick={onOpenRegistrationModal}
            className="px-10 py-5 bg-rose-500 text-white rounded-2xl font-black text-xl shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all flex items-center gap-2 group"
          >
            등록하기
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-3xl font-black text-gray-900">음성 잠금 모드</h3>
            <p className="text-sm font-bold text-gray-400">
              현재 설정: {formatTime(voiceLockTimeout)}
            </p>
          </div>
        </div>
      )}

      {isVoiceLockRegistered && (
        <>
          <div className="h-px w-full bg-gray-100" />

          <div className="flex flex-col gap-12">
            {/* 활성화 토글 */}
            <div className="flex items-center justify-between">
              <div className="w-32 text-lg font-black text-gray-400 uppercase tracking-widest">
                사용 여부
              </div>
              <div className="flex-1 pl-10 flex items-center justify-between">
                <span className="text-[18px] font-black text-gray-900 leading-none">
                  음성 잠금 {isVoiceLockEnabled ? '켜짐' : '꺼짐'}
                </span>
                <button
                  onClick={() => setVoiceLockEnabled(!isVoiceLockEnabled)}
                  className="w-14 h-7 rounded-full relative transition-all duration-300 bg-gray-200 overflow-hidden"
                >
                  <motion.div
                    animate={{ backgroundColor: isVoiceLockEnabled ? '#f43f5e' : '#e5e7eb' }}
                    className="absolute inset-0"
                  />
                  <motion.div
                    animate={{ x: isVoiceLockEnabled ? 32 : 4 }}
                    className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-md z-10"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isVoiceLockEnabled && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex flex-col gap-12"
                >
                  {/* 암호 문구 */}
                  <div className="flex items-start justify-between">
                    <div className="w-32 text-lg font-black text-gray-400 uppercase tracking-widest pt-1">
                      해제 문구
                    </div>
                    <div className="flex-1 pl-10 flex flex-col gap-3">
                      <div className="relative group max-w-2xl">
                        <input
                          type="text"
                          value={lockPhrase}
                          onChange={(e) => setLockPhrase(e.target.value)}
                          placeholder="새 해제 문구를 입력하세요"
                          className="w-full bg-gray-50 border-2 border-rose-50 rounded-2xl py-6 px-8 font-black text-[18px] text-gray-900 focus:outline-none focus:border-rose-500 transition-all leading-tight"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <Mic className="w-6 h-6 text-rose-500" />
                        </div>
                      </div>
                      <p className="text-sm font-bold text-gray-400">
                        * 현재 등록된 본인의 목소리 비밀번호입니다.
                      </p>
                    </div>
                  </div>

                  {/* 잠금 시간 */}
                  <div className="flex items-start justify-between">
                    <div className="w-32 text-lg font-black text-gray-400 uppercase tracking-widest pt-1">
                      자동 잠금
                    </div>
                    <div className="flex-1 pl-10 flex flex-col gap-8">
                      <div className="flex items-center gap-6">
                        {[5, 10, 30, 60].map((mins) => (
                          <button
                            key={mins}
                            onClick={() => setTimeoutDuration(mins * 60)}
                            className={`px-10 py-5 rounded-2xl font-black text-2xl transition-all ${
                              timeoutDuration === mins * 60
                                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 active:scale-95'
                                : 'bg-gray-50 text-gray-400 border-2 border-transparent hover:border-gray-100'
                            }`}
                          >
                            {mins >= 60 ? `${Math.floor(mins / 60)}시간` : `${mins}분`}
                          </button>
                        ))}
                      </div>
                      <p className="text-sm font-bold text-gray-400">
                        활동이 멈춘 지{' '}
                        <span className="text-rose-500">{formatTime(timeoutDuration)}</span> 후
                        화면이 잠깁니다.
                      </p>
                    </div>
                  </div>

                  {/* 저장 버튼 */}
                  <div className="flex justify-end pt-10">
                    <button
                      onClick={handleSaveSecuritySettings}
                      disabled={isSaving || !lockPhrase.trim()}
                      className="px-12 py-5 bg-rose-500 text-white rounded-2xl font-black text-2xl shadow-xl shadow-rose-500/20 hover:bg-rose-600 transition-all flex items-center gap-3 active:scale-95 disabled:bg-gray-200"
                    >
                      <ShieldCheck className="w-7 h-7" />
                      {isSaving ? '저장 중...' : '설정 저장'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-center pt-24">
            <button
              onClick={async () => {
                if (window.confirm('음성 정보를 삭제하시겠습니까? 기능이 비활성화됩니다.')) {
                  try {
                    await clearVoiceLock();
                    alert('삭제 완료');
                  } catch {
                    alert('실패');
                  }
                }
              }}
              className="flex items-center gap-2 text-rose-500 font-black text-lg hover:underline underline-offset-8"
            >
              <XCircle className="w-5 h-5" />
              음성 데이터 초기화 및 재등록
            </button>
          </div>
        </>
      )}
    </div>
  );
}
