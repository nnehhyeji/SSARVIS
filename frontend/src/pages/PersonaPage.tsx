import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, Sparkles, MessageCircle, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground';

export default function PersonaPage() {
  const navigate = useNavigate();
  const { friendName } = useParams();
  const [description, setDescription] = useState('');
  const [qna, setQna] = useState([
    { id: 1, question: '이 친구는 평소에 어떤 말투를 사용하나요?', answer: '' },
    { id: 2, question: '자주 사용하는 유행어나 말버릇이 있나요?', answer: '' },
    { id: 3, question: '이 친구가 가장 좋아하는 관심사는 무엇인가요?', answer: '' },
  ]);

  const handleAnswerChange = (id: number, value: string) => {
    setQna((prev) => prev.map((item) => (item.id === id ? { ...item, answer: value } : item)));
  };

  const handleSave = () => {
    // TODO: API 연동하여 저장 로직 구현
    alert(`${friendName}님의 페르소나가 저장되었습니다.`);
    navigate('/', { state: { fromPersona: true, friendName } });
  };

  return (
    <div className="relative w-full h-screen overflow-y-auto overflow-x-hidden flex flex-col font-sans">
      <AnimatedBackground />

      {/* 헤더 */}
      <header className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-white/10 border-b border-white/20">
        <button
          onClick={() => navigate('/', { state: { fromPersona: true, friendName } })}
          className="p-2 rounded-full hover:bg-white/20 transition-all text-white flex items-center gap-2 group"
        >
          <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold px-1">돌아가기</span>
        </button>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          {friendName}의 페르소나 설정
        </h1>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold rounded-full shadow-lg hover:shadow-pink-500/30 hover:scale-105 transition-all flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          저장하기
        </button>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 w-full max-w-3xl mx-auto pt-28 pb-20 px-6 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-10"
        >
          {/* 섹션 1: 내가 보는 친구의 모습 */}
          <section className="bg-white/20 backdrop-blur-xl rounded-[40px] p-8 border border-white/30 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-pink-100 rounded-2xl shadow-inner">
                <UserIcon className="w-6 h-6 text-pink-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  친구가 당신에게 어떤 사람인가요?
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  이 친구를 생각하면 떠오르는 단어나 이미지를 자유롭게 적어주세요.
                </p>
              </div>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 김싸피는 저에게 항상 긍정적인 에너지를 주는 소중한 동기입니다. 가끔 엉뚱하지만 누구보다 열정적이에요."
              className="w-full h-40 bg-white/40 border border-white/50 rounded-3xl p-6 text-gray-800 placeholder-gray-400 outline-none focus:bg-white/60 focus:border-pink-300 transition-all shadow-inner resize-none leading-relaxed"
            />
          </section>

          {/* 섹션 2: 질문에 대한 답변 */}
          <section className="bg-white/20 backdrop-blur-xl rounded-[40px] p-8 border border-white/30 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-indigo-100 rounded-2xl shadow-inner">
                <MessageCircle className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">친구의 성격이나 습관</h2>
                <p className="text-gray-600 text-sm mt-1">
                  AI가 친구를 더 잘 이해할 수 있도록 답변을 채워주세요.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              {qna.map((item) => (
                <div key={item.id} className="flex flex-col gap-3">
                  <label className="text-gray-700 font-bold ml-2 text-lg flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-indigo-400 rounded-full inline-block" />
                    {item.question}
                  </label>
                  <input
                    type="text"
                    value={item.answer}
                    onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                    placeholder="답변을 입력해 주세요"
                    className="w-full bg-white/40 border border-white/50 rounded-2xl py-4 px-6 text-gray-800 placeholder-gray-400 outline-none focus:bg-white/60 focus:border-indigo-300 transition-all shadow-inner"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* 하단 저장 버튼 */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleSave}
              className="group relative px-12 py-4 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold text-lg rounded-full shadow-xl hover:shadow-pink-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
            >
              <Save className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              페르소나 설정 완료
              <div className="absolute inset-x-0 -bottom-1 h-px bg-white/20 blur-sm" />
            </button>
          </div>
        </motion.div>
      </main>

      {/* 하단 플로팅 장식 */}
      <div className="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white/20 to-transparent pointer-events-none -z-10" />
    </div>
  );
}
