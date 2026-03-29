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
  handleBackToMbti: () => void;
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
  handleBackToMbti,
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
      className="bg-white/30 backdrop-blur-2xl border border-white/40 rounded-[2rem] shadow-2xl p-8 flex flex-col min-h-[800px] w-full relative overflow-hidden"
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
      <div className="w-full h-2 bg-white/40 rounded-full overflow-hidden mb-6 shrink-0">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-gray-800 to-gray-600"
        />
      </div>

      <div className="flex-1 min-h-0 px-2 pb-2 flex flex-col justify-center relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className={`flex flex-col flex-1 relative ${
              currentIndex === 0 && !isCurrentAnswered ? 'z-[60]' : ''
            }`}
          >
            {/* Simple Onboarding Border */}
            {currentIndex === 0 && !isCurrentAnswered && (
              <div className="absolute -inset-4 sm:-inset-6 rounded-[2.5rem] border-4 border-white/80 border-dashed pointer-events-none flex justify-center z-0 h-[calc(100%+20px)] mt-[-10px]">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="absolute -top-6 sm:-top-8"
                >
                  <div className="bg-white text-gray-800 px-6 py-3 rounded-full text-sm sm:text-base font-black shadow-2xl flex items-center gap-2 border border-gray-100 whitespace-nowrap tracking-tight">
                    🎤 말하고 싶은 항목을{' '}
                    <span className="bg-gray-100 rounded-md px-2 py-1 mx-1 text-purple-600">
                      "1번"
                    </span>{' '}
                    처럼 이야기해보세요!
                  </div>
                </motion.div>
              </div>
            )}

            {/* Question Text */}
            <div className="mb-6 flex flex-col items-center justify-center text-center px-4 shrink-0 relative z-10">
              <div className="p-2 bg-white/60 rounded-xl mb-4 shadow-sm border border-white">
                <Sparkles className="w-5 h-5 text-gray-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-800 leading-tight">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Choice List */}
            <div className="flex flex-col gap-3 mb-2 justify-center shrink-0 relative z-10">
              {currentQuestion.choices.map((choice) => {
                const isSelected = currentAnswer === choice;

                return (
                  <div key={choice} className="relative z-20">
                    <button
                      onClick={() => handleSelectAnswer(choice)}
                      className={`w-full py-4 px-6 rounded-2xl font-bold transition-all text-left flex items-center justify-between group border border-transparent ${
                        isSelected
                          ? 'bg-gray-800 text-white shadow-lg scale-[1.01]'
                          : 'bg-white/90 text-gray-600 hover:bg-white border-white/50'
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
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 mt-auto pt-6 shrink-0 relative z-[60]">
        <button
          onClick={currentIndex === 0 ? handleBackToMbti : handlePrevQuestion}
          className="flex-1 py-4 bg-white/60 text-gray-500 rounded-2xl font-bold border border-white hover:bg-white hover:text-gray-700 transition-all flex items-center justify-center gap-2 group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          {currentIndex === 0 ? 'MBTI로' : '이전'}
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
      <div className="h-4 mt-4 relative z-20">
        <p
          className={`text-center text-xs font-bold transition-opacity duration-300 ${isCurrentAnswered ? 'opacity-0' : 'text-gray-400 animate-pulse'}`}
        >
          답변을 선택하면 다음으로 넘어갈 수 있습니다.
        </p>
      </div>

      {/* Onboarding Dim Overlay */}
      <AnimatePresence>
        {currentIndex === 0 && !isCurrentAnswered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 pointer-events-none rounded-[2rem]"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
