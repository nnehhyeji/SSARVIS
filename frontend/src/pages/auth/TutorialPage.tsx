import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Upload,
  CheckCircle2,
  ArrowRight,
  FileAudio,
  Loader2,
  Sparkles,
  RefreshCcw,
} from 'lucide-react';
import AnimatedBackground from '../../components/AnimatedBackground';
import { PATHS } from '../../routes/paths';

type Step = 'mode-select' | 'file-upload' | 'tutorial' | 'review' | 'loading';
type InputMode = 'voice' | 'file';

const QUESTIONS = [
  '당신을 가장 잘 나타내는 한 단어는 무엇인가요?',
  '가장 행복했던 기억에 대해 들려주세요.',
  '새로운 도전을 할 때 어떤 마음가짐으로 임하시나요?',
  '스트레스를 받았을 때 나만의 해소 방법이 있나요?',
  '10년 후의 당신은 어떤 모습일 것 같나요?',
  '가장 소중하게 생각하는 가치는 무엇인가요?',
  '최근 당신을 가장 웃게 했던 일은 무엇인가요?',
];

export default function TutorialPage() {
  const navigate = useNavigate();

  // --- States ---
  const [step, setStep] = useState<Step>('mode-select');
  const [inputMode, setInputMode] = useState<InputMode | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(new Array(QUESTIONS.length).fill(''));
  const [isRecording, setIsRecording] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);

  // Wave animation durations (memoized per the previous purity fixes)
  const [waveDurations] = useState<number[]>(() => [...Array(15)].map(() => 1 + Math.random()));

  // --- Handlers ---
  const handleModeSelect = (mode: InputMode) => {
    setInputMode(mode);
    if (mode === 'file') {
      setStep('file-upload');
    } else {
      setStep('tutorial');
    }
  };

  const currentAnswer = answers[currentIndex];
  const setStepAnswer = (val: string) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = val;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (step === 'file-upload') {
      setStep('tutorial');
      return;
    }

    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setStep('review');
    }
  };

  const handleFinish = () => {
    setStep('loading');
    // Simulate AI creation loading
    setTimeout(() => {
      navigate(PATHS.HOME);
    }, 3500);
  };

  const progress = ((currentIndex + 1) / QUESTIONS.length) * 100;

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center p-4">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl z-10"
      >
        <div className="bg-white/40 backdrop-blur-2xl border border-white/40 rounded-[3rem] shadow-2xl p-10 min-h-[500px] flex flex-col">
          <AnimatePresence mode="wait">
            {/* 1. Mode Selection Step */}
            {step === 'mode-select' && (
              <motion.div
                key="mode"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col items-center justify-center text-center space-y-10"
              >
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <h1 className="text-3xl font-black text-gray-800">환영합니다!</h1>
                  <p className="text-gray-500 font-medium">
                    나만의 AI를 만들기 위해 당신의 목소리와 성격을 들려주세요.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <button
                    onClick={() => handleModeSelect('voice')}
                    className="p-8 bg-white/60 hover:bg-white/80 border border-white/60 rounded-[2rem] shadow-lg transition-all transform hover:scale-[1.02] group flex flex-col items-center text-center space-y-4"
                  >
                    <div className="p-4 bg-purple-100 rounded-2xl group-hover:bg-purple-200 transition-colors">
                      <Mic className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">직접 말하기</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        질문에 목소리로 답하며
                        <br />
                        데이터를 수집합니다.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleModeSelect('file')}
                    className="p-8 bg-white/60 hover:bg-white/80 border border-white/60 rounded-[2rem] shadow-lg transition-all transform hover:scale-[1.02] group flex flex-col items-center text-center space-y-4"
                  >
                    <div className="p-4 bg-indigo-100 rounded-2xl group-hover:bg-indigo-200 transition-colors">
                      <Upload className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">파일 업로드</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        목소리 파일을 올리고
                        <br />
                        텍스트로 응답합니다.
                      </p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* 2. File Upload Step (Sub-step for File Mode) */}
            {step === 'file-upload' && (
              <motion.div
                key="file-upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col items-center justify-center text-center space-y-10"
              >
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto">
                    <Upload className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">목소리 파일 업로드</h2>
                  <p className="text-gray-500 text-sm font-medium">
                    AI가 당신의 목소리를 학습할 수 있도록
                    <br />
                    녹음된 오디오 파일을 업로드해주세요.
                  </p>
                </div>

                <div className="w-full p-8 border-2 border-dashed border-indigo-200 rounded-[2rem] bg-indigo-50/10 flex flex-col items-center space-y-4 transition-all hover:border-indigo-300">
                  <FileAudio className="w-12 h-12 text-indigo-400" />
                  <div className="text-center">
                    <p className={`font-bold ${isUploaded ? 'text-green-600' : 'text-gray-700'}`}>
                      {isUploaded ? '파일이 준비되었습니다!' : '오디오 파일 선택'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isUploaded ? '파일명: my_voice_sample.wav' : 'MP3, WAV, M4A 지원'}
                    </p>
                  </div>
                  {!isUploaded ? (
                    <button
                      onClick={() => setIsUploaded(true)}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition active:scale-95"
                    >
                      파일 찾기
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsUploaded(false)}
                      className="text-xs font-bold text-gray-400 hover:text-red-400 transition"
                    >
                      다시 선택하기
                    </button>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  disabled={!isUploaded}
                  className="w-full py-4 bg-gray-800 text-white rounded-2xl font-bold shadow-xl hover:bg-gray-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  업로드 완료 및 진행하기{' '}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            )}

            {/* 3. Tutorial Q&A Step */}
            {step === 'tutorial' && (
              <motion.div
                key="tutorial"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col"
              >
                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-200/50 rounded-full mb-10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                  />
                </div>

                <div className="flex-1 flex flex-col items-center text-center space-y-8">
                  <span className="px-4 py-1.5 bg-purple-500/10 text-purple-600 rounded-full text-sm font-bold">
                    질문 {currentIndex + 1} / {QUESTIONS.length}
                  </span>
                  <h2 className="text-2xl font-bold text-gray-800 leading-tight h-16">
                    {QUESTIONS[currentIndex]}
                  </h2>

                  {/* Input Area */}
                  <div className="w-full flex-1 flex flex-col items-center justify-center space-y-8">
                    {inputMode === 'voice' ? (
                      <div className="space-y-6 flex flex-col items-center">
                        <div className="flex items-center justify-center gap-1.5 h-16 mb-4">
                          {waveDurations.map((d, i) => (
                            <motion.div
                              key={i}
                              animate={{
                                height: isRecording ? [8, 48, 12, 56, 8] : 8,
                                opacity: isRecording ? [0.4, 1, 0.4] : 0.3,
                              }}
                              transition={{
                                duration: d,
                                repeat: Infinity,
                                ease: 'easeInOut',
                                delay: i * 0.05,
                              }}
                              className="w-1.5 bg-purple-500 rounded-full shadow-sm"
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => setIsRecording(!isRecording)}
                          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl shadow-purple-500/20 ${
                            isRecording
                              ? 'bg-red-500 hover:bg-red-600 ring-8 ring-red-500/20'
                              : 'bg-purple-600 hover:bg-purple-700'
                          }`}
                        >
                          <Mic
                            className={`w-10 h-10 text-white ${isRecording ? 'animate-pulse' : ''}`}
                          />
                        </button>
                        <p
                          className={`text-sm font-bold ${isRecording ? 'text-red-500' : 'text-gray-400'}`}
                        >
                          {isRecording
                            ? '목소리를 녹음 중입니다...'
                            : '마이크를 눌러 답변을 시작하세요'}
                        </p>
                        {!isRecording && currentIndex > 0 && (
                          <span className="text-xs text-green-500 font-bold">
                            ✓ 이전 답변 수집 완료
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-full space-y-6">
                        <div className="relative">
                          <textarea
                            value={currentAnswer}
                            onChange={(e) => setStepAnswer(e.target.value)}
                            placeholder="여기에 답변을 입력하세요..."
                            className="w-full h-40 p-6 bg-white/50 border border-white/80 rounded-[2rem] focus:outline-none focus:ring-2 focus:ring-indigo-400/50 resize-none font-medium placeholder:text-gray-300"
                          />
                          <div className="absolute bottom-4 right-6 text-xs text-gray-400 font-bold">
                            {currentAnswer.length} 자
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleNext}
                    className="w-full py-4 bg-gray-800 text-white rounded-2xl font-bold shadow-xl hover:bg-gray-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                  >
                    {currentIndex < QUESTIONS.length - 1 ? (
                      <>
                        다음 질문으로{' '}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    ) : (
                      <>
                        최종 확인하기 <CheckCircle2 className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* 3. Review Step */}
            {step === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-black text-gray-800">거의 다 왔어요!</h2>
                  <p className="text-gray-500 font-medium">
                    작성하신 내용은 나만의 AI 페르소나를 구성하는 데 사용됩니다.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[400px] custom-scrollbar">
                  {QUESTIONS.map((q, i) => (
                    <div
                      key={i}
                      className="p-6 bg-white/50 border border-white/60 rounded-3xl space-y-2"
                    >
                      <p className="text-xs font-black text-purple-600 uppercase tracking-widest">
                        Q{i + 1}. {q}
                      </p>
                      <p className="text-gray-700 font-medium leading-relaxed italic">
                        {inputMode === 'voice'
                          ? '목소리 데이터를 분석하여 반영합니다.'
                          : answers[i] || '(입력된 내용 없음)'}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setCurrentIndex(0);
                      setStep('tutorial');
                    }}
                    className="flex-1 py-4 bg-white/60 text-gray-700 rounded-2xl font-bold border border-white/60 hover:bg-white/80 transition flex items-center justify-center gap-2"
                  >
                    <RefreshCcw className="w-5 h-5" /> 다시 시작
                  </button>
                  <button
                    onClick={handleFinish}
                    className="flex-[2] py-4 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-2xl font-bold shadow-xl hover:scale-[1.01] transition-all"
                  >
                    이대로 AI 생성하기
                  </button>
                </div>
              </motion.div>
            )}

            {/* 4. Loading Step */}
            {step === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center space-y-8"
              >
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    className="w-32 h-32 rounded-full border-4 border-dashed border-purple-500/30"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    AI 페르소나 생성 중...
                  </h2>
                  <p className="text-gray-500 font-medium">
                    당신의 목소리와 성격을 학습하고 있습니다.
                    <br />
                    잠시만 기다려 주세요.
                  </p>
                </div>

                <div className="flex gap-2">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-3 h-3 bg-purple-500 rounded-full"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
