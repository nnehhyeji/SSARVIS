import type { VoicePhase } from './tutorialConstants';
import { motion } from 'framer-motion';
import { Mic, Square, RefreshCcw, CheckCircle2, Pencil, ChevronRight } from 'lucide-react';

interface VoiceStepProps {
  voiceTopic: string;
  voicePhase: VoicePhase;
  recordingTime: number;
  finalTranscript: string;
  interimTranscript: string;
  editableTranscript: string;
  setEditableTranscript: (val: string) => void;
  startRecording: () => void;
  stopRecording: () => void;
  handleFinish: () => void;
  timerPercent: number;
  waveDurations: number[];
  setVoicePhase: (phase: VoicePhase) => void;
  setRecordingTime: (time: number) => void;
  setAudioBlob: (blob: Blob | null) => void;
  setFinalTranscript: (text: string) => void;
  MAX_RECORDING_SEC: number;
}

export default function VoiceStep({
  voiceTopic,
  voicePhase,
  recordingTime,
  finalTranscript,
  interimTranscript,
  editableTranscript,
  setEditableTranscript,
  startRecording,
  stopRecording,
  handleFinish,
  timerPercent,
  waveDurations,
  setVoicePhase,
  setRecordingTime,
  setAudioBlob,
  setFinalTranscript,
  MAX_RECORDING_SEC,
}: VoiceStepProps) {
  return (
    <motion.div
      key="voice"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="bg-white/30 backdrop-blur-2xl border border-white/40 rounded-[3rem] shadow-2xl p-8 flex flex-col"
    >
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-8 space-y-2">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-gray-500/5 mb-2">
          <Mic className="w-7 h-7 text-gray-700" />
        </div>
        <h1 className="text-2xl font-black text-gray-800">목소리를 들려주세요</h1>
        <p className="text-gray-500 text-sm font-medium">
          아래 주제에 대해 {MAX_RECORDING_SEC}초 동안 편하게 말해주세요.
        </p>
      </div>

      {/* 랜덤 주제 카드 */}
      <div className="w-full bg-white/60 p-6 rounded-2xl border border-white mb-8 shadow-sm text-center">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
          오늘의 주제
        </p>
        <p className="text-lg font-bold text-gray-800 leading-snug">💬 {voiceTopic}</p>
      </div>

      {/* Recording Area */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
        {/* ── idle: 녹음 시작 전 ── */}
        {voicePhase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Wave (정적) */}
            <div className="flex items-center justify-center gap-1 h-12">
              {waveDurations.slice(0, 16).map((_, i) => (
                <div key={i} className="w-1.5 h-6 bg-gray-200 rounded-full" />
              ))}
            </div>
            <motion.button
              onClick={startRecording}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center shadow-2xl hover:bg-gray-700 transition-colors"
            >
              <Mic className="w-10 h-10 text-white" />
            </motion.button>
            <p className="text-sm text-gray-400 font-medium">마이크를 눌러 녹음을 시작하세요</p>
          </motion.div>
        )}

        {/* ── recording: 녹음 중 ── */}
        {voicePhase === 'recording' && (
          <motion.div
            key="recording"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            {/* 타이머 링 */}
            <div className="relative w-24 h-24 mb-1">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  fill="none"
                  stroke="rgba(0,0,0,0.05)"
                  strokeWidth="8"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  fill="none"
                  stroke="#1f2937"
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - timerPercent / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-gray-800">
                  {MAX_RECORDING_SEC - recordingTime}
                </span>
                <span className="text-[10px] font-bold text-gray-400">초</span>
              </div>
            </div>

            {/* 파형 */}
            <div className="flex items-center justify-center gap-1 h-10">
              {waveDurations.slice(0, 16).map((d, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [4, 32, 6, 28, 4], opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: d,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.05,
                  }}
                  className="w-1.5 bg-gray-600 rounded-full"
                />
              ))}
            </div>

            {/* 실시간 자막 */}
            <div className="w-full min-h-[60px] px-4 py-3 bg-white/50 border border-white/60 rounded-2xl text-sm text-gray-700 font-medium leading-relaxed">
              {finalTranscript || interimTranscript ? (
                <>
                  <span>{finalTranscript}</span>
                  <span className="text-gray-400">{interimTranscript}</span>
                </>
              ) : (
                <span className="text-gray-300">말씀하시면 여기에 실시간으로 표시됩니다...</span>
              )}
            </div>

            <motion.button
              onClick={stopRecording}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-xl ring-8 ring-red-500/10 hover:bg-red-600 transition-colors"
            >
              <Square className="w-7 h-7 text-white fill-white" />
            </motion.button>
            <p className="text-xs text-red-400 font-bold">
              🔴 녹음 중 — 중지하려면 버튼을 누르세요
            </p>
          </motion.div>
        )}

        {/* ── review: 녹음 확인 및 수정 ── */}
        {voicePhase === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4 w-full"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-bold text-gray-700">
                  녹음 완료 ({recordingTime}초)
                </span>
              </div>
              <button
                onClick={() => {
                  setVoicePhase('idle');
                  setRecordingTime(0);
                  setAudioBlob(null);
                  setFinalTranscript('');
                  setEditableTranscript('');
                }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-bold transition-colors"
              >
                <RefreshCcw className="w-3.5 h-3.5" /> 다시 녹음
              </button>
            </div>

            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Pencil className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-xs font-bold text-gray-600">
                  인식된 내용을 직접 수정할 수 있어요
                </p>
              </div>
              <textarea
                value={editableTranscript}
                onChange={(e) => setEditableTranscript(e.target.value)}
                rows={4}
                className="w-full p-5 bg-white/80 border border-white/60 rounded-3xl text-sm text-gray-700 leading-relaxed font-medium focus:ring-2 focus:ring-gray-200 outline-none resize-none shadow-inner transition-all"
                placeholder="내용이 인식되지 않았습니다. 입력을 원하신다면 직접 작성하실 수도 있습니다."
              />
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-5 bg-gray-800 text-white rounded-3xl font-bold shadow-xl hover:bg-gray-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group mt-4 overflow-hidden relative"
            >
              <span className="relative z-10">튜토리얼 완료하기</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                initial={false}
              />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
