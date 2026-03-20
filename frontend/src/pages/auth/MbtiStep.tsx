import type { Dispatch, SetStateAction } from 'react';
import { motion } from 'framer-motion';
import { Command, Zap, ChevronRight } from 'lucide-react';

interface MbtiSlots {
  e_i: string;
  s_n: string;
  t_f: string;
  j_p: string;
}

interface MbtiStepProps {
  mbtiSlots: MbtiSlots;
  setMbtiSlots: Dispatch<SetStateAction<MbtiSlots>>;
  isMbtiSkipped: boolean;
  setIsMbtiSkipped: (val: boolean) => void;
  hasMbti: boolean;
  selectedMbti: string;
  isValidToProceed: boolean;
  handleMbtiNext: () => void;
}

export default function MbtiStep({
  mbtiSlots,
  setMbtiSlots,
  isMbtiSkipped,
  setIsMbtiSkipped,
  hasMbti,
  selectedMbti,
  isValidToProceed,
  handleMbtiNext,
}: MbtiStepProps) {
  return (
    <motion.div
      key="mbti"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.4 }}
      className="bg-white/30 backdrop-blur-2xl border border-white/40 rounded-[2rem] shadow-2xl p-6 sm:p-8 flex flex-col items-center"
    >
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-6 space-y-2">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-100 mb-1">
          <Command className="w-6 h-6 text-gray-700" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-800">나의 MBTI는?</h1>
        <p className="text-sm text-gray-500 font-medium leading-relaxed">
          자신의 MBTI를 알고 있다면 선택해주세요.
          <br />
          관련된 질문들은 AI가 자동으로 채워 넘어갑니다.
        </p>
      </div>

      {/* MBTI Slots UI */}
      <div className="w-full flex flex-col gap-3 mb-6">
        {/* 선택 안함 Toggle */}
        <button
          onClick={() => {
            setIsMbtiSkipped(true);
            setMbtiSlots({ e_i: '', s_n: '', t_f: '', j_p: '' });
          }}
          className={`w-full py-3 sm:py-3.5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
            isMbtiSkipped
              ? 'bg-gray-800 text-white shadow-md'
              : 'bg-white/60 text-gray-500 hover:bg-white border border-white/80'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black ${
              isMbtiSkipped ? 'bg-white text-gray-800' : 'bg-gray-200 text-gray-500'
            }`}
          >
            ?
          </span>
          MBTI를 모르거나 선택하지 않음
        </button>

        <div className="relative">
          {/* Overlay if skipped */}
          {isMbtiSkipped && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] rounded-2xl z-10 transition-all duration-300" />
          )}

          {/* Slots Map */}
          <div className="flex flex-col gap-2">
            {[
              { key: 'e_i', left: 'E', right: 'I', l_label: '외향', r_label: '내향' },
              { key: 's_n', left: 'S', right: 'N', l_label: '감각', r_label: '직관' },
              { key: 't_f', left: 'T', right: 'F', l_label: '사고', r_label: '감정' },
              { key: 'j_p', left: 'J', right: 'P', l_label: '판단', r_label: '인식' },
            ].map((row) => (
              <div key={row.key} className="flex gap-2.5">
                {[
                  { val: row.left, label: row.l_label },
                  { val: row.right, label: row.r_label },
                ].map((opt) => {
                  const isSelected = mbtiSlots[row.key as keyof MbtiSlots] === opt.val;
                  return (
                    <button
                      key={opt.val}
                      onClick={() => {
                        setIsMbtiSkipped(false);
                        setMbtiSlots((p) => ({ ...p, [row.key]: opt.val }));
                      }}
                      className={`flex-1 py-2 sm:py-3 rounded-xl font-bold flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-gray-800 text-white shadow-md border border-gray-800'
                          : 'bg-white/60 text-gray-400 hover:bg-white/90 border border-white/80'
                      }`}
                    >
                      <span
                        className={`text-lg sm:text-xl font-black ${isSelected ? 'text-white' : 'text-gray-700'}`}
                      >
                        {opt.val}
                      </span>
                      <span
                        className={`text-[10px] ${isSelected ? 'opacity-80' : 'fixed-opacity-40'}`}
                      >
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info box */}
      {hasMbti && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-4 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center gap-3"
        >
          <Zap className="w-5 h-5 text-gray-400 shrink-0" />
          <p className="text-xs sm:text-sm text-gray-600 font-medium">
            <strong>{selectedMbti}</strong> 선택 시 관련된 문항들이 자동으로 작성되며 생략됩니다.
          </p>
        </motion.div>
      )}

      <button
        disabled={!isValidToProceed}
        onClick={handleMbtiNext}
        className="w-full py-4 bg-gray-800 text-white rounded-2xl font-bold shadow-lg hover:bg-gray-700 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 transition-all flex items-center justify-center gap-2 group"
      >
        다음으로
        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>
    </motion.div>
  );
}
