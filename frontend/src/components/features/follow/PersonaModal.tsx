import { useState } from 'react';
import { Save, Sparkles, MessageCircle, User as UserIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { postEvaluationPrompt } from '../../../apis/aiApi';

interface PersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  followName: string;
  targetUserId: number | null;
}

export default function PersonaModal({
  isOpen,
  onClose,
  followName,
  targetUserId,
}: PersonaModalProps) {
  const [description, setDescription] = useState('');
  const [qna, setQna] = useState([
    { id: 1, question: '이 사용자는 평소에 어떤 말투를 사용하나요?', answer: '' },
    { id: 2, question: '자주 사용하는 유행어나 말버릇이 있나요?', answer: '' },
    { id: 3, question: '이 사용자가 가장 좋아하는 관심사는 무엇인가요?', answer: '' },
  ]);

  const handleAnswerChange = (id: number, value: string) => {
    setQna((prev) => prev.map((item) => (item.id === id ? { ...item, answer: value } : item)));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!targetUserId) {
      alert('대상 사용자 정보를 확인할 수 없습니다.');
      return;
    }
    if (!description.trim()) {
      alert('설명을 입력해주세요!');
      return;
    }
    const hasEmptyAnswers = qna.some((q) => !q.answer.trim());
    if (hasEmptyAnswers) {
      alert('모든 질문에 답해주세요!');
      return;
    }

    setIsSubmitting(true);
    try {
      const combinedAnswer = [
        `이 사람은 당신에게 어떤 사람인가요?\n${description.trim()}`,
        ...qna.map((q) => `${q.question}\n${q.answer.trim()}`),
      ].join('\n\n');

      const response = await postEvaluationPrompt(targetUserId, {
        userInputQuestion: '이 사람에 대한 종합 문답',
        userInputAnswer: combinedAnswer,
      });
      const latestPromptCount = response.data.promptCount;
      const generatedPrompt = response.data.systemPrompt;

      alert(
        generatedPrompt.trim()
          ? `${followName}님의 페르소나가 성공적으로 저장되었습니다.`
          : `${followName}님의 문답이 저장되었습니다. 현재 누적 ${latestPromptCount}개예요.`,
      );
      setIsSubmitting(false);
      onClose();
    } catch (error) {
      console.error('페르소나 문답 제출 실패:', error);
      alert('설정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* 모달 윈도우 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] bg-white/30 backdrop-blur-2xl rounded-[40px] border border-white/40 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* 헤더 */}
            <div className="px-8 py-6 border-b border-white/20 flex items-center justify-between bg-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-xl shadow-inner">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 tracking-tight">
                  {followName}의 페르소나 설정
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/30 rounded-full transition-all text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 본문 (스크롤) */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 custom-scrollbar">
              {/* 섹션 1: 설명 */}
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-gray-700 font-bold text-lg">
                  <UserIcon className="w-5 h-5 text-pink-500" />이 사용자가 당신에게 어떤
                  사람인가요?
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="예: 김싸피는 저에게 항상 긍정적인 에너지를 주는 소중한 동기입니다. 가끔 엉뚱하지만 누구보다 열정적이에요."
                  className="w-full h-32 bg-white/40 border border-white/50 rounded-3xl p-5 text-gray-800 placeholder-gray-400 outline-none focus:bg-white/60 focus:border-pink-300 transition-all shadow-inner resize-none text-sm leading-relaxed"
                />
              </section>

              {/* 섹션 2: Q&A */}
              <section className="flex flex-col gap-6">
                <div className="flex items-center gap-2 text-gray-700 font-bold text-lg">
                  <MessageCircle className="w-5 h-5 text-indigo-500" />
                  사용자의 성격이나 습관
                </div>
                <div className="flex flex-col gap-5">
                  {qna.map((item) => (
                    <div key={item.id} className="flex flex-col gap-2">
                      <label className="text-gray-600 text-sm font-semibold ml-1">
                        {item.question}
                      </label>
                      <input
                        type="text"
                        value={item.answer}
                        onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                        placeholder="답변을 입력해 주세요"
                        className="w-full bg-white/40 border border-white/50 rounded-2xl py-3 px-5 text-gray-800 placeholder-gray-400 outline-none focus:bg-white/60 focus:border-indigo-300 transition-all shadow-inner text-sm"
                      />
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* 푸터 */}
            <div className="px-8 py-6 bg-white/20 border-t border-white/20 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-white/40 text-gray-700 font-bold hover:bg-white/60 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="px-8 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold shadow-lg shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">저장 중...</span>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    설정 완료
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
