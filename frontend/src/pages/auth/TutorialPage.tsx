import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  Mic,
  Square,
  Sparkles,
  Command,
  Loader2,
  CheckCircle2,
  Zap,
  Pencil,
  RefreshCcw,
} from 'lucide-react';
import AnimatedBackground from '../../components/AnimatedBackground';
import { PATHS } from '../../routes/paths';

// ─── Types ───────────────────────────────────────────────────────────────────

type TutorialStep = 'mbti' | 'questions' | 'voice' | 'loading';

interface Question {
  question: string;
  choices: string[];
  autochoice: Record<string, string>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const QUESTIONS: Question[] = [
  {
    question: '현재 가장 많은 시간을 보내는 곳은 어디인가요?',
    choices: ['집', '학교', '직장', '여러 장소를 자주 옮김', '기타'],
    autochoice: {},
  },
  {
    question: '평일 생활 패턴은 어떤 편인가요?',
    choices: ['매우 규칙적', '어느 정도 규칙적', '들쭉날쭉함', '거의 즉흥적'],
    autochoice: { J: '매우 규칙적', P: '거의 즉흥적' },
  },
  {
    question: '혼자 있는 시간과 사람 만나는 시간 중 어느 쪽이 더 편한가요?',
    choices: ['혼자가 더 편함', '사람이 더 편함', '둘 다 괜찮음', '상황 따라 다름'],
    autochoice: { E: '사람이 더 편함', I: '혼자가 더 편함' },
  },
  {
    question: '주말에 가장 자주 하는 일을 하나만 고르면?',
    choices: ['쉬기', '친구/연인 만나기', '취미 활동', '공부/일', '집안일', '기타'],
    autochoice: {},
  },
  {
    question: '처음 만난 사람들이 나를 보통 어떻게 느끼는 편이라고 생각하나요?',
    choices: ['조용함', '무난함', '친근함', '차가움', '똑부러짐', '약간 거리감 있음', '기타'],
    autochoice: {},
  },
  {
    question: '친해진 뒤의 모습은 첫인상과 비교해 어떤 편인가요?',
    choices: [
      '거의 비슷함',
      '더 말이 많아짐',
      '더 장난스러워짐',
      '더 편하고 풀어짐',
      '감정을 더 드러냄',
      '기타',
    ],
    autochoice: {},
  },
  {
    question: '혼자 있을 때의 나는 남들 앞의 나와 비교하면?',
    choices: [
      '거의 비슷함',
      '훨씬 조용함',
      '훨씬 감정적임',
      '훨씬 게을러짐',
      '훨씬 자유로움',
      '기타',
    ],
    autochoice: {},
  },
  {
    question: '평소 결정은 어떤 편인가요?',
    choices: [
      '빠르게 정함',
      '충분히 고민하고 정함',
      '작은 건 빠르고 큰 건 오래 고민함',
      '상황 따라 다름',
    ],
    autochoice: { J: '빠르게 정함', P: '상황 따라 다름' },
  },
  {
    question: '선택할 때 가장 먼저 보는 것은 무엇인가요?',
    choices: ['내 감정', '실용성', '손해/리스크', '다른 사람 반응', '장기적인 결과'],
    autochoice: { F: '내 감정', T: '실용성', S: '실용성', N: '장기적인 결과' },
  },
  {
    question: '갑자기 일정이 바뀌거나 변수가 생기면?',
    choices: ['바로 적응함', '약간 스트레스 받지만 맞춤', '꽤 불편해함', '매우 싫어함'],
    autochoice: { P: '바로 적응함', J: '매우 싫어함' },
  },
  {
    question: '안전한 선택과 흥미로운 선택 중 어느 쪽에 더 가깝나요?',
    choices: ['대체로 안전한 선택', '대체로 흥미로운 선택', '반반', '상황 따라 다름'],
    autochoice: { S: '대체로 안전한 선택', N: '대체로 흥미로운 선택' },
  },
  {
    question: '가장 자주 느끼는 쪽에 가까운 것은?',
    choices: ['차분함', '걱정', '의욕', '피곤함', '짜증', '무난함', '기타'],
    autochoice: {},
  },
  {
    question: '스트레스를 받으면 제일 먼저 나타나는 반응은?',
    choices: [
      '말수가 줄어듦',
      '예민해짐',
      '혼자 있고 싶어짐',
      '딴짓을 하게 됨',
      '누군가에게 말하고 싶어짐',
      '겉으로는 티 안 남',
    ],
    autochoice: {},
  },
  {
    question: '화가 났을 때 보통 어떻게 하나요?',
    choices: ['바로 말함', '돌려서 표현함', '참다가 나중에 말함', '그냥 넘김', '거리를 둠'],
    autochoice: { T: '바로 말함', F: '돌려서 표현함' },
  },
  {
    question: '속상한 일이 있을 때 더 가까운 쪽은?',
    choices: ['혼자 정리함', '믿는 사람에게 말함', '시간이 지나길 기다림', '다른 일로 잊으려 함'],
    autochoice: {},
  },
  {
    question: '칭찬을 들으면 보통 어떤 반응이 나오나요?',
    choices: ['바로 좋아함', '민망해함', '겉으로는 담담함', '의심부터 듦', '상황 따라 다름'],
    autochoice: {},
  },
  {
    question: '평소 말투는 어떤 편인가요?',
    choices: [
      '짧고 간단함',
      '차분하고 정돈됨',
      '부드럽고 무난함',
      '장난기 있음',
      '직설적임',
      '상황 따라 달라짐',
    ],
    autochoice: {},
  },
  {
    question: '대화할 때 나는 보통',
    choices: [
      '먼저 말을 거는 편',
      '상대가 걸어오면 잘 받는 편',
      '먼저는 잘 안 거는 편',
      '사람 따라 다름',
    ],
    autochoice: { E: '먼저 말을 거는 편', I: '먼저는 잘 안 거는 편' },
  },
  {
    question: '대화 중 침묵이 생기면?',
    choices: ['내가 먼저 채우는 편', '괜찮다고 느낌', '약간 어색해함', '많이 불편해함'],
    autochoice: { E: '내가 먼저 채우는 편', I: '괜찮다고 느낌' },
  },
  {
    question: '낯선 사람 많은 자리에서는 보통',
    choices: [
      '먼저 분위기를 살핌',
      '자연스럽게 섞임',
      '필요한 말만 함',
      '아는 사람 옆에 붙어 있음',
    ],
    autochoice: { E: '자연스럽게 섞임', I: '필요한 말만 함' },
  },
  {
    question: '친해지는 속도는 어떤 편인가요?',
    choices: ['빠름', '느림', '상대에 따라 많이 다름', '처음엔 느리지만 친해지면 빠름'],
    autochoice: {},
  },
  {
    question: '누군가가 선을 넘는 말을 했을 때 보통',
    choices: ['바로 지적함', '부드럽게 돌려 말함', '일단 넘기고 거리 둠', '상황을 더 봄'],
    autochoice: { T: '바로 지적함', F: '부드럽게 돌려 말함' },
  },
  {
    question: '부탁을 거절해야 할 때 나는',
    choices: ['분명하게 거절함', '미안해하며 거절함', '핑계를 대는 편', '거절을 잘 못함'],
    autochoice: { T: '분명하게 거절함', F: '미안해하며 거절함' },
  },
  {
    question: '남들이 나를 자주 오해하는 부분이 있나요?',
    choices: [
      '없음',
      '차갑게 보이지만 실제론 아님',
      '밝아 보이지만 실제론 아님',
      '무난해 보이지만 생각이 많음',
      '강해 보이지만 실제론 예민함',
      '기타',
    ],
    autochoice: {},
  },
  {
    question: '겉으로 잘 드러내지 않는 면에 가까운 것은?',
    choices: [
      '불안이 많음',
      '인정받고 싶음',
      '혼자 생각이 많음',
      '상처를 잘 받음',
      '의외로 고집이 셈',
      '특별히 숨기는 면은 없음',
    ],
    autochoice: {},
  },
  {
    question: '내 단점으로 가장 자주 떠오르는 것은?',
    choices: ['미루는 습관', '예민함', '우유부단함', '고집', '과한 걱정', '감정 표현 부족', '기타'],
    autochoice: {},
  },
  {
    question: '스스로 생각할 때 나는 모순적인 면이 있나요?',
    choices: [
      '안정 원하지만 지루한 건 싫음',
      '사람 좋지만 혼자 있고 싶음',
      '감정적이지만 티는 안 냄',
      '인정받고 싶지만 관심은 부담스러움',
      '딱히 떠오르지 않음',
      '기타',
    ],
    autochoice: {},
  },
  {
    question: '쉬는 시간에 가장 자주 하는 것은?',
    choices: [
      '휴대폰 보기',
      '음악 듣기',
      '영상 보기',
      '책/글 읽기',
      '멍하니 쉬기',
      '사람과 대화하기',
      '기타',
    ],
    autochoice: {},
  },
  {
    question: '좋아하는 분위기에 가까운 것은?',
    choices: [
      '조용하고 차분한 분위기',
      '밝고 가벼운 분위기',
      '편한 사람들끼리의 분위기',
      '자극적이고 활기찬 분위기',
      '상황 따라 다름',
    ],
    autochoice: {},
  },
  {
    question: '싫어하는 상황 하나를 고르면?',
    choices: [
      '시끄럽고 산만한 분위기',
      '어색한 침묵',
      '무례한 사람',
      '감정소모 큰 대화',
      '갑작스러운 일정 변경',
      '기타',
    ],
    autochoice: { J: '갑작스러운 일정 변경', I: '시끄럽고 산만한 분위기', F: '감정소모 큰 대화' },
  },
];

// ─── Voice Topics ─────────────────────────────────────────────────────────────

const VOICE_TOPICS = [
  '가장 행복했던 기억에 대해 자유롭게 이야기해 보세요.',
  '요즘 가장 즐겁게 하고 있는 일이 있다면 말해주세요.',
  '오늘 하루 어떻게 보내셨는지 편하게 말해주세요.',
  '자신이 가장 좋아하는 장소와 그 이유를 말해주세요.',
  '최근에 새롭게 관심을 갖게 된 것이 있다면 이야기해주세요.',
  '가장 소중하게 생각하는 사람이나 것에 대해 말해주세요.',
  '스트레스를 받을 때 어떻게 풀어내는지 이야기해주세요.',
  '꼭 이루고 싶은 작은 목표나 소망이 있다면 말해주세요.',
];

// ─── Helper ──────────────────────────────────────────────────────────────────

function buildAutoAnswers(mbti: string): string[] {
  const chars = mbti.split('');
  return QUESTIONS.map((q) => {
    for (const char of chars) {
      if (q.autochoice[char]) return q.autochoice[char];
    }
    return '';
  });
}

// SpeechRecognition 타입 선언 (브라우저 호환)
interface SpeechRecognitionResultAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionResultAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

type SpeechRecognitionType = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: unknown) => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionType;
    webkitSpeechRecognition: new () => SpeechRecognitionType;
  }
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: TutorialStep }) {
  const steps: { key: TutorialStep; label: string }[] = [
    { key: 'mbti', label: 'MBTI' },
    { key: 'questions', label: '질문' },
    { key: 'voice', label: '목소리' },
  ];
  const order: TutorialStep[] = ['mbti', 'questions', 'voice', 'loading'];
  const currentIdx = order.indexOf(current);

  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {steps.map((s, i) => {
        const stepIdx = order.indexOf(s.key);
        const isDone = currentIdx > stepIdx;
        const isActive = current === s.key;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-gray-800 to-gray-600 text-white shadow-lg'
                  : isDone
                    ? 'bg-gray-100 text-gray-500 border border-gray-200'
                    : 'bg-white/40 text-gray-400 border border-white/40'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <span className="w-3.5 h-3.5 flex items-center justify-center text-xs">
                  {i + 1}
                </span>
              )}
              <span>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-[2px] rounded-full transition-all duration-500 ${currentIdx > stepIdx ? 'bg-gray-300' : 'bg-white/30'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TutorialPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<TutorialStep>('mbti');

  // ── MBTI State 분리 ────────────────────────────────────────────────────────
  const [mbtiSlots, setMbtiSlots] = useState({ e_i: '', s_n: '', t_f: '', j_p: '' });
  const [isMbtiSkipped, setIsMbtiSkipped] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(new Array(QUESTIONS.length).fill(''));
  const [waveDurations] = useState<number[]>(() =>
    [...Array(20)].map(() => 0.8 + Math.random() * 1.2),
  );

  // ── Voice 전용 State ─────────────────────────────────────────────────────
  const [voiceTopic] = useState<string>(
    () => VOICE_TOPICS[Math.floor(Math.random() * VOICE_TOPICS.length)],
  );
  type VoicePhase = 'idle' | 'recording' | 'review';
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [editableTranscript, setEditableTranscript] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTranscriptRef = useRef('');

  const MAX_RECORDING_SEC = 30;

  const stopRecording = useCallback(() => {
    // 타이머 정지
    if (timerRef.current) clearInterval(timerRef.current);
    // MediaRecorder 정지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    // STT 정지
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // 중지 오류 무시
      }
    }
    setInterimTranscript('');
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      finalTranscriptRef.current = '';
      setFinalTranscript('');
      setInterimTranscript('');
      setRecordingTime(0);

      // MediaRecorder (WebM)
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setEditableTranscript(finalTranscriptRef.current);
        setFinalTranscript(finalTranscriptRef.current);
        stream.getTracks().forEach((t) => t.stop());
        setVoicePhase('review');
      };
      mr.start();
      mediaRecorderRef.current = mr;

      // SpeechRecognition
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognition: SpeechRecognitionType = new SpeechRecognitionAPI();
        recognition.lang = 'ko-KR';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = '';
          let final = finalTranscriptRef.current;
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              final += result[0].transcript + ' ';
            } else {
              interim += result[0].transcript;
            }
          }
          finalTranscriptRef.current = final;
          setFinalTranscript(final);
          setInterimTranscript(interim);
        };
        recognition.onerror = () => {
          // 에러 처리 무시
        };
        recognition.start();
        recognitionRef.current = recognition;
      }

      // 30초 타이머
      setVoicePhase('recording');
      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed += 1;
        setRecordingTime(elapsed);
        if (elapsed >= MAX_RECORDING_SEC) {
          stopRecording();
        }
      }, 1000);
    } catch {
      alert('마이크 접근 권한이 필요합니다.');
    }
  }, [stopRecording]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current)
        try {
          recognitionRef.current.stop();
        } catch {
          // 정리 중 오류 무시
        }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const hasMbti =
    !isMbtiSkipped && !!(mbtiSlots.e_i && mbtiSlots.s_n && mbtiSlots.t_f && mbtiSlots.j_p);
  const selectedMbti = hasMbti
    ? `${mbtiSlots.e_i}${mbtiSlots.s_n}${mbtiSlots.t_f}${mbtiSlots.j_p}`
    : '';
  const isValidToProceed = isMbtiSkipped || hasMbti;

  // ── MBTI Step Actions ────────────────────────────────────────────────────
  const handleMbtiNext = () => {
    if (hasMbti) {
      const auto = buildAutoAnswers(selectedMbti);
      setAnswers(auto);
    } else {
      setAnswers(new Array(QUESTIONS.length).fill(''));
    }
    setCurrentIndex(0);
    setStep('questions');
  };

  // ── Question Step Actions ────────────────────────────────────────────────

  // MBTI 선택 시: autochoice 매칭이 없는 문항들만 사용자가 직접 답해야 함
  // MBTI 미선택 시: 전체 30개 데 직접 답해야 함
  const manualIndices = useMemo(() => {
    if (!hasMbti) return QUESTIONS.map((_, i) => i);
    const chars = selectedMbti.split('');
    return QUESTIONS.reduce<number[]>((acc, q, i) => {
      const hasAutoMatch = chars.some((char) => !!q.autochoice[char]);
      if (!hasAutoMatch) acc.push(i);
      return acc;
    }, []);
  }, [hasMbti, selectedMbti]);

  // currentIndex = manualIndices 내에서의 위치 (0-based)
  // actualIdx   = 실제 QUESTIONS 배열에서의 인덱스
  const actualIdx = manualIndices[currentIndex] ?? 0;

  const handleSelectAnswer = (choice: string) => {
    const next = [...answers];
    next[actualIdx] = choice;
    setAnswers(next);
  };

  const isCurrentAnswered = answers[actualIdx] !== '';

  const answeredCount = manualIndices.filter((i) => answers[i] !== '').length;
  const totalManual = manualIndices.length;
  const allAnswered = answeredCount === totalManual;

  const handleNextQuestion = () => {
    if (currentIndex < manualIndices.length - 1) {
      setCurrentIndex((p) => p + 1);
    } else {
      setStep('voice');
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) setCurrentIndex((p) => p - 1);
  };

  // ── Voice Step: 최종 제출 ─────────────────────────────────────────────────
  const handleFinish = () => {
    setStep('loading');
    const qna = QUESTIONS.map((q, i) => ({ question: q.question, answer: answers[i] }));
    const formData = new FormData();
    formData.append('qna', JSON.stringify(qna));
    if (audioBlob) formData.append('voice', audioBlob, 'voice.webm');
    // TODO: axios.post('/api/v1/tutorial', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    console.log('[Tutorial] qna:', qna, '| audio blob:', audioBlob);
    setTimeout(() => {
      navigate(PATHS.HOME);
    }, 3000);
  };

  const progress = totalManual > 0 ? ((currentIndex + 1) / totalManual) * 100 : 100;
  const timerPercent = (recordingTime / MAX_RECORDING_SEC) * 100;

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center p-4">
      <AnimatedBackground />

      <div className="w-full max-w-2xl z-10">
        {/* Step indicator */}
        {step !== 'loading' && <StepIndicator current={step} />}

        <AnimatePresence mode="wait">
          {/* ─── STEP 1: MBTI ─────────────────────────────────────────────── */}
          {step === 'mbti' && (
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
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black ${isMbtiSkipped ? 'bg-white text-gray-800' : 'bg-gray-200 text-gray-500'}`}
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
                          const isSelected =
                            mbtiSlots[row.key as keyof typeof mbtiSlots] === opt.val;
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
                    <strong>{selectedMbti}</strong> 선택 시 관련된 문항들이 자동으로 작성되며
                    생략됩니다.
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
          )}

          {/* ─── STEP 2: QUESTIONS ────────────────────────────────────────── */}
          {step === 'questions' && (
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

              {/* Progress bar */}
              <div className="w-full h-2 bg-white/40 rounded-full mb-8 overflow-hidden">
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 30 }}
                  className="h-full bg-gray-800 rounded-full"
                />
              </div>

              {/* Question */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col flex-1"
                >
                  <h2 className="text-xl font-black text-gray-800 mb-6 leading-snug min-h-[3.5rem] flex items-center">
                    {QUESTIONS[actualIdx].question}
                  </h2>

                  {/* Choices */}
                  <div className="grid grid-cols-1 gap-2.5 mb-8">
                    {QUESTIONS[actualIdx].choices.map((choice) => {
                      const isSelected = answers[actualIdx] === choice;
                      return (
                        <motion.button
                          key={choice}
                          onClick={() => handleSelectAnswer(choice)}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full text-left px-5 py-4 rounded-2xl border font-semibold text-sm transition-all duration-200 flex items-center justify-between ${
                            isSelected
                              ? 'bg-gray-800 border-gray-800 text-white shadow-md'
                              : 'bg-white/60 border-white text-gray-600 hover:bg-white/90 hover:border-gray-200'
                          }`}
                        >
                          <span>{choice}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex gap-3">
                <button
                  onClick={handlePrevQuestion}
                  disabled={currentIndex === 0}
                  className="px-5 py-4 bg-white/80 border border-white rounded-2xl font-bold text-gray-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                  이전
                </button>

                <button
                  onClick={handleNextQuestion}
                  disabled={!isCurrentAnswered}
                  className="flex-1 py-4 bg-gray-800 text-white rounded-2xl font-bold shadow-lg hover:bg-gray-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 transition-all flex items-center justify-center gap-2 group"
                >
                  {currentIndex < manualIndices.length - 1 ? (
                    <>
                      다음 질문
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  ) : (
                    <>
                      {allAnswered ? '음성 단계로' : `${totalManual - answeredCount}개 남음`}
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>

              {/* Hint if not answered */}
              {!isCurrentAnswered && (
                <p className="text-center text-xs text-gray-400 font-medium mt-3">
                  답변을 선택해야 다음으로 넘어갈 수 있어요
                </p>
              )}
            </motion.div>
          )}

          {/* ─── STEP 3: VOICE ────────────────────────────────────────────── */}
          {step === 'voice' && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.4 }}
              className="bg-white/30 backdrop-blur-2xl border border-white/40 rounded-[3rem] shadow-2xl p-8 flex flex-col"
            >
              {/* Header */}
              <div className="flex flex-col items-center text-center mb-6 space-y-2">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-gray-100 mb-1">
                  <Mic className="w-7 h-7 text-gray-700" />
                </div>
                <h1 className="text-2xl font-black text-gray-800">목소리를 들려주세요</h1>
                <p className="text-gray-500 text-sm font-medium">
                  아래 주제에 대해 30초 동안 편하게 말해주세요.
                </p>
              </div>

              {/* 랜덤 주제 카드 */}
              <div className="w-full mb-6 px-6 py-5 bg-white/60 border border-white/80 rounded-2xl shadow-sm">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  오늘의 주제
                </p>
                <p className="text-lg font-bold text-gray-800 leading-snug">💬 {voiceTopic}</p>
              </div>

              <AnimatePresence mode="wait">
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
                        <div key={i} className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
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
                    <p className="text-sm text-gray-400 font-medium">
                      마이크를 눌러 녹음을 시작하세요
                    </p>
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
                          style={{ transition: 'stroke-dashoffset 1s linear' }}
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
                        <span className="text-gray-300">
                          말씀하시면 여기에 실시간으로 표시됩니다...
                        </span>
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

                {/* ── review: 녹음 완료 후 수정 ── */}
                {voicePhase === 'review' && (
                  <motion.div
                    key="review"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-4"
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
                        placeholder="(인식된 내용이 없으면 직접 입력해주세요)"
                        className="w-full h-32 px-4 py-3 bg-white/80 border border-white rounded-2xl text-sm text-gray-700 font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none shadow-sm"
                      />
                    </div>

                    <button
                      onClick={handleFinish}
                      className="w-full py-4 bg-gray-800 text-white rounded-2xl font-bold shadow-xl hover:bg-gray-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                    >
                      <Sparkles className="w-5 h-5 opacity-80" />
                      AI 페르소나 생성하기
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform opacity-80" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => setStep('questions')}
                className="mt-5 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors text-center"
              >
                ← 이전 단계로 (질문 수정)
              </button>
            </motion.div>
          )}

          {/* ─── STEP 4: LOADING ──────────────────────────────────────────── */}
          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/30 backdrop-blur-2xl border border-white/40 rounded-[3rem] shadow-2xl p-16 flex flex-col items-center text-center space-y-8"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  className="w-36 h-36 rounded-full border-4 border-dashed border-gray-400/30"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-14 h-14 text-gray-700 animate-spin" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-gray-800">AI 페르소나 생성 중...</h2>
                <p className="text-gray-500 font-medium">
                  당신의 답변과 목소리를 학습하고 있습니다.
                  <br />
                  잠시만 기다려 주세요.
                </p>
              </div>

              <div className="flex gap-2">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-3 h-3 bg-gray-600 rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
