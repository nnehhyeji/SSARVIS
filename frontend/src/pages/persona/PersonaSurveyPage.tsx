import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Sparkles, MessageCircle, User as UserIcon } from 'lucide-react';

import AnimatedBackground from '../../components/AnimatedBackground';
import { BG_COLORS } from '../../constants/theme';
import { PATHS } from '../../routes/paths';
import { postGeneratePrompt } from '../../apis/aiApi';

export default function PersonaSurveyPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFirst = searchParams.get('isFirst') === 'true';

  const [userName, setUserName] = useState('사용자');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // API 호줄 예시 자리 (임시 로직)
    const fetchUser = async () => {
      const idNum = Number(userId);
      if (idNum === 1) setUserName('김싸피');
      else setUserName('친구');
    };
    fetchUser();
  }, [userId]);

  const [description, setDescription] = useState('');
  const [qna, setQna] = useState([
    { id: 1, question: '이 사용자는 평소에 어떤 말투를 사용하나요?', answer: '' },
    { id: 2, question: '자주 사용하는 유행어나 말버릇이 있나요?', answer: '' },
    { id: 3, question: '이 사용자가 가장 좋아하는 관심사는 무엇인가요?', answer: '' },
  ]);

  const handleAnswerChange = (id: number, value: string) => {
    setQna((prev) => prev.map((item) => (item.id === id ? { ...item, answer: value } : item)));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      alert('설명을 입력해주세요!');
      return;
    }
    const hasEmptyAnswers = qna.some((q) => !q.answer.trim());
    if (hasEmptyAnswers) {
      alert('모든 질문에 답해주세요!');
      return;
    }

    const payload = [
      { question: '이 사람은 당신에게 어떤 사람인가요?', answer: description.trim() },
      ...qna.map((q) => ({ question: q.question, answer: q.answer.trim() })),
    ];

    if (isFirst) {
      // 첫 응답: 생성 중 화면을 띄우고 기다린 뒤 이동
      setIsGenerating(true);
      try {
        await postGeneratePrompt(payload);
      } catch (error) {
        console.error('프롬프트 생성 실패:', error);
      } finally {
        navigate(`${PATHS.VISIT(Number(userId))}?mode=persona`);
      }
    } else {
      // 기존 페르소나가 있는 경우: fire-and-forget 백그라운드 처리 후 즉시 이동
      setIsSubmitting(true); // 버튼 더블클릭 방지용
      postGeneratePrompt(payload).catch((error) => console.error('프롬프트 업데이트 실패:', error));

      alert('설문이 반영되었습니다! 감사합니다.');
      navigate(`${PATHS.VISIT(Number(userId))}?mode=persona`);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col justify-center items-center">
      <AnimatedBackground {...BG_COLORS.persona} />

      <AnimatePresence mode="wait">
        {isGenerating ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-[90%] max-w-md bg-white/30 backdrop-blur-3xl rounded-[40px] border border-white/40 shadow-2xl p-10 flex flex-col items-center gap-6 text-center"
          >
            <div className="w-24 h-24 bg-blue-400/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-xl border-2 border-blue-300/50 animate-pulse">
              <Sparkles className="w-12 h-12 text-blue-500 animate-[spin_3s_linear_infinite]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 mb-3 tracking-tight">
                {userName}님의 AI를
                <br />
                생성 중입니다!
              </h2>
              <p className="text-gray-700 font-bold leading-relaxed">
                작성해주신 소중한 데이터로
                <br />
                페르소나를 구축하고 있어요.
                <br />
                잠시만 기다려주세요...
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.5 }}
            className="relative w-[90%] max-w-2xl bg-white/20 backdrop-blur-3xl rounded-[40px] border border-white/40 shadow-2xl p-6 sm:p-10 flex flex-col gap-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            {/* Header */}
            <div className="flex flex-col items-center gap-3 mb-2 text-center">
              <div className="p-4 bg-yellow-100/90 rounded-[2cqw] shadow-inner mb-2 inline-block">
                <Sparkles className="w-10 h-10 text-yellow-500" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-800 tracking-tighter">
                {userName}님의 페르소나 설정
              </h1>
              <p className="text-gray-600 font-semibold text-sm sm:text-base px-4">
                {userName}님은 어떤 분인가요?
                <br className="sm:hidden" /> 소중한 답변이 AI의 성격 형성에 도움을 줍니다.
              </p>
            </div>

            {/* Section 1 */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-gray-800 font-black text-lg">
                <UserIcon className="w-6 h-6 text-pink-500" />
                <span>이 사람은 당신에게 어떤 사람인가요?</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="예: 항상 긍정적인 에너지를 주는 소중한 친구입니다. 가끔 엉뚱하지만 언제나 내 편이 되어줘요."
                className="w-full h-32 bg-white/50 border border-white/60 rounded-3xl p-5 text-gray-800 placeholder-gray-500 outline-none focus:bg-white/70 focus:border-pink-300 transition-all shadow-inner resize-none text-base font-medium leading-relaxed"
              />
            </section>

            {/* Section 2 */}
            <section className="flex flex-col gap-6">
              <div className="flex items-center gap-2 text-gray-800 font-black text-lg">
                <MessageCircle className="w-6 h-6 text-indigo-500" />
                <span>평소 성격이나 습관을 알려주세요!</span>
              </div>
              <div className="flex flex-col gap-5">
                {qna.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2">
                    <label className="text-gray-700 text-sm font-bold ml-2">{item.question}</label>
                    <input
                      type="text"
                      value={item.answer}
                      onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                      placeholder="답변을 입력해 주세요"
                      className="w-full bg-white/50 border border-white/60 rounded-2xl py-3.5 px-6 text-gray-800 placeholder-gray-500 outline-none focus:bg-white/70 focus:border-indigo-300 transition-all shadow-inner text-base font-medium"
                    />
                  </div>
                ))}
              </div>
            </section>

            <div className="flex justify-center mt-2">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full max-w-sm py-4 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white font-black text-lg shadow-xl shadow-pink-500/20 hover:scale-[1.03] active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:scale-100"
              >
                <>
                  <Save className="w-6 h-6" />
                  제출 완료하기
                </>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
