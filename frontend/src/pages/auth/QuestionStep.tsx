import { motion } from 'framer-motion';
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
      className="bg-white/30 backdrop-blur-2xl border border-white/40 rounded-[3rem] shadow-2xl p-8 flex flex-col"
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
      <div className="grid grid-cols-1 gap-3 mb-10">
        {currentQuestion.choices.map((choice) => {
          const isSelected = currentAnswer === choice;
          return (
            <button
              key={choice}
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
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 mt-auto">
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
        <p className="text-center text-xs font-bold text-gray-400 mt-4 animate-pulse">
          답변을 선택하면 다음으로 넘어갈 수 있습니다.
        </p>
      )}
    </motion.div>
  );
}
