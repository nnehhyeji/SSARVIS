import { Mic, Pencil, RefreshCcw, Square, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { useSpeechTopicInput } from '../../../hooks/useSpeechTopicInput';

interface AiTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (topic: string) => void | Promise<void>;
  isSubmitting?: boolean;
}

export default function AiTopicModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: AiTopicModalProps) {
  const {
    phase,
    recordingTime,
    finalTranscript,
    interimTranscript,
    editableTranscript,
    isSupported,
    errorMessage,
    startRecording,
    stopRecording,
    reset,
    setEditableTranscript,
  } = useSpeechTopicInput();

  const timerPercent = useMemo(() => Math.min((recordingTime / 20) * 100, 100), [recordingTime]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const topic = editableTranscript.trim();
    if (!topic) return;
    await onSubmit(topic);
    reset();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl rounded-[2rem] bg-white/90 backdrop-blur-2xl shadow-2xl border border-white/70 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-rose-400">
                  AI TO AI
                </p>
                <h2 className="text-2xl font-black text-gray-900 mt-1">주제를 음성으로 던져주세요</h2>
                <p className="text-sm text-gray-500 mt-1">
                  말한 내용은 자동으로 텍스트로 바뀌고, 시작 전에 직접 수정할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-5">
              {!isSupported && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  이 브라우저는 음성 인식을 지원하지 않습니다. 직접 주제를 입력해주세요.
                </div>
              )}

              {errorMessage && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                  {errorMessage}
                </div>
              )}

              <div className="rounded-[1.75rem] bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100 p-6">
                {phase !== 'recording' ? (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-rose-500 text-white shadow-xl flex items-center justify-center">
                      <Mic className="w-9 h-9" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900">예시: 너희 둘 다 봄에 어디 가고 싶은지 얘기해봐</h3>
                      <p className="text-sm font-medium text-gray-500 mt-2">
                        마이크를 눌러 주제를 말하거나 바로 아래 입력창에서 적어도 됩니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void startRecording();
                      }}
                      disabled={isSubmitting}
                      className="px-5 py-3 rounded-full bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors"
                    >
                      음성으로 주제 말하기
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-24 h-24">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                        <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="8" />
                        <circle
                          cx="48"
                          cy="48"
                          r="42"
                          fill="none"
                          stroke="#111827"
                          strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 42}`}
                          strokeDashoffset={`${2 * Math.PI * 42 * (1 - timerPercent / 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-gray-900">{20 - recordingTime}</span>
                        <span className="text-[10px] font-bold text-gray-400">초</span>
                      </div>
                    </div>

                    <div className="w-full min-h-[88px] rounded-[1.5rem] bg-white/80 border border-white px-5 py-4 text-sm leading-relaxed text-gray-700 font-medium">
                      {finalTranscript || interimTranscript ? (
                        <>
                          <span>{finalTranscript} </span>
                          <span className="text-gray-400">{interimTranscript}</span>
                        </>
                      ) : (
                        <span className="text-gray-300">주제를 말씀하시면 여기에 실시간으로 표시됩니다.</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={stopRecording}
                      className="w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xl"
                    >
                      <Square className="w-6 h-6 fill-white" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Pencil className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-bold text-gray-700">주제 수정</span>
                  {phase === 'review' && (
                    <button
                      type="button"
                      onClick={() => {
                        reset();
                        void startRecording();
                      }}
                      className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      다시 녹음
                    </button>
                  )}
                </div>
                <textarea
                  value={editableTranscript}
                  onChange={(event) => setEditableTranscript(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-[1.75rem] border border-gray-200 bg-white px-5 py-4 text-sm text-gray-700 font-medium leading-relaxed outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="예: 둘이 서로의 성격을 소개하면서 누가 더 계획적인지 이야기해봐."
                />
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-white/70">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-3 rounded-full bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={isSubmitting || !editableTranscript.trim()}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 text-white font-black shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '대화 준비 중...' : 'AI 대화 시작'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
