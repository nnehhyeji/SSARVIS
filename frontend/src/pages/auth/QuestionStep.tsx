import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import type { Question } from './tutorialConstants';

interface QuestionStepProps {
  currentIndex: number;
  totalManual: number;
  answeredCount: number;
  progress: number;
  currentQuestion: Question;
  currentAnswer: string;
  handleSelectAnswer: (ans: string) => void;
  handlePrevQuestion: () => void;
  handleNextQuestion: () => void;
  isCurrentAnswered: boolean;
  allAnswered: boolean;
}

export default function QuestionStep({
  currentIndex,
  totalManual,
  answeredCount,
  progress,
  currentQuestion,
  currentAnswer,
  handleSelectAnswer,
  handlePrevQuestion,
  handleNextQuestion,
  isCurrentAnswered,
  allAnswered,
}: QuestionStepProps) {
  return (
    <motion.div
      key="questions"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.4 }}
      className="bg-white/30 backdrop-blur-2xl border border-white/40 rounded-[2rem] shadow-2xl p-8 flex flex-col h-[700px] w-full relative overflow-hidden"
    >
      {/* Progress row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-gray-500">
          {currentIndex + 1} / {totalManual}
        </span>
        <span className="text-sm font-bold text-purple-500">
          {answeredCount}/{totalManual} 완료
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-white/40 rounded-full overflow-hidden mb-10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-gray-800 to-gray-600"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
        {/* Question Text */}
        <div className="mb-10 min-h-[100px] flex flex-col items-center justify-center text-center px-4">
          <div className="p-2 bg-white/60 rounded-xl mb-4 shadow-sm border border-white">
            <Sparkles className="w-5 h-5 text-gray-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-800 leading-tight">
            {currentQuestion.question}
          </h2>
        </div>

        {/* Choice List */}
        <div className="flex flex-col gap-3 mb-6 justify-center">
          {currentQuestion.choices.map((choice, i) => {
            const isSelected = currentAnswer === choice;
            const isOnboardingTarget = currentIndex === 0 && i === 0 && !isCurrentAnswered;

            return (
              <div key={choice} className={`relative ${isOnboardingTarget ? 'z-[60]' : 'z-20'}`}>
                <button
                  onClick={() => handleSelectAnswer(choice)}
                  className={`w-full py-4 px-6 rounded-2xl font-bold transition-all text-left flex items-center justify-between group ${
                    isSelected
                      ? 'bg-gray-800 text-white shadow-lg scale-[1.01]'
                      : 'bg-white/60 text-gray-600 hover:bg-white border border-white'
                  }`}
                >
                  <span>{choice}</span>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-white bg-white/20 scale-110'
                        : 'border-gray-200 group-hover:border-gray-300'
                    }`}
                  >
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isOnboardingTarget && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute z-[70] left-1/2 -top-16 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none sm:top-1/2 sm:-translate-y-1/2 sm:-left-[260px] sm:-translate-x-0 sm:flex-row sm:left-auto"
                    >
                      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] whitespace-nowrap text-sm sm:text-base border border-white/20 flex flex-col items-center sm:items-end font-medium">
                        <span>숫자로 <strong className="text-yellow-300 text-lg font-black bg-black/10 px-2 py-0.5 rounded-lg ml-1">"1번"</strong> 이라고</span>
                        <span>소리 내어 말해보세요!</span>
                      </div>
                      <motion.div animate={{ x: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="hidden sm:block">
                        <span className="text-4xl drop-shadow-lg">👉</span>
                      </motion.div>
                      <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="block sm:hidden">
                        <span className="text-4xl drop-shadow-lg">👇</span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 mt-2">
        <button
          onClick={handlePrevQuestion}
          disabled={currentIndex === 0}
          className="flex-1 py-4 bg-white/60 text-gray-400 rounded-2xl font-bold border border-white hover:bg-white hover:text-gray-600 transition-all flex items-center justify-center gap-2 group disabled:opacity-0"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          이전
        </button>
        <button
          onClick={handleNextQuestion}
          disabled={!isCurrentAnswered}
          className="flex-[2] py-4 bg-gray-800 text-white rounded-2xl font-bold shadow-xl hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-2 group"
        >
          {currentIndex === totalManual - 1
            ? allAnswered
              ? '마지막 단계로'
              : '답변을 완성해 주세요'
            : '다음으로'}
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Hint if not answered */}
      {!isCurrentAnswered && (
        <p className="text-center text-xs font-bold text-gray-400 mt-4 animate-pulse relative z-20">
          답변을 선택하면 다음으로 넘어갈 수 있습니다.
        </p>
      )}

      {/* Onboarding Dim Overlay */}
      <AnimatePresence>
        {currentIndex === 0 && !isCurrentAnswered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#281b30]/70 backdrop-blur-[2px] z-50 pointer-events-none rounded-[2rem]"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
