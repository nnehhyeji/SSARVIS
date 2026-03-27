import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';

import { PATHS } from '../../routes/paths';

// 분리된 데이터 및 컴포넌트 임포트
import { QUESTIONS, VOICE_TOPICS, buildAutoAnswers } from './tutorialConstants';
import type {
  TutorialStep,
  VoicePhase,
  SpeechRecognitionEvent,
  SpeechRecognitionType,
} from './tutorialConstants';

import MbtiStep from './MbtiStep';
import QuestionStep from './QuestionStep';
import VoiceStep from './VoiceStep';

import { postGeneratePrompt, postRegisterVoice } from '../../apis/aiApi';
import { useUserStore } from '../../store/useUserStore';

// Window 전역 타입 확장
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
  const nickname = useUserStore((state) => state.userInfo?.nickname?.trim() ?? '');

  const [step, setStep] = useState<TutorialStep>('mbti');

  // ── MBTI State ────────────────────────────────────────────────────────
  const [mbtiSlots, setMbtiSlots] = useState({ e_i: '', s_n: '', t_f: '', j_p: '' });
  const [isMbtiSkipped, setIsMbtiSkipped] = useState(false);

  // ── Questions State ─────────────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(new Array(QUESTIONS.length).fill(''));
  const [waveDurations] = useState<number[]>(() =>
    [...Array(20)].map(() => 0.8 + Math.random() * 1.2),
  );

  // ── Voice State ─────────────────────────────────────────────────────
  const [voiceTopic] = useState<string>(
    () => VOICE_TOPICS[Math.floor(Math.random() * VOICE_TOPICS.length)],
  );
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [editableTranscript, setEditableTranscript] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');

  const MAX_RECORDING_SEC = 30;

  // ── Resources Cleanup ──────────────────────────────────────────────────
  const stopAllMediaResources = useCallback(() => {
    // 1. 타이머 정지
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // 2. STT 정지
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // 중지 오류 무시
      }
      recognitionRef.current = null;
    }
    // 3. MediaRecorder 정지
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // 중지 오류 무시
      }
      mediaRecorderRef.current = null;
    }
    // 4. MediaStream 정지 (마이크 아이콘 사라짐 보장)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    setInterimTranscript('');
  }, []);

  const stopRecording = useCallback(() => {
    stopAllMediaResources();
  }, [stopAllMediaResources]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      finalTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      setFinalTranscript('');
      setInterimTranscript('');
      setRecordingTime(0);

      // MediaRecorder (WebM)
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const fullTranscript = (finalTranscriptRef.current + interimTranscriptRef.current).trim();
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setEditableTranscript(fullTranscript);
        setFinalTranscript(fullTranscript);
        setVoicePhase('review');
        // 녹음이 완전히 끝나면 스트림 정리
        stopAllMediaResources();
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
          interimTranscriptRef.current = interim;
          setFinalTranscript(final);
          setInterimTranscript(interim);
        };
        recognition.onerror = () => {
          // 에러 시 무시 혹은 처리
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
  }, [stopRecording, stopAllMediaResources]);

  // 컴포넌트 언마운트 시 모든 리소스 정리
  useEffect(() => {
    return () => {
      stopAllMediaResources();
    };
  }, [stopAllMediaResources]);

  // ── MBTI Logic ──────────────────────────────────────────────────────────
  const hasMbti =
    !isMbtiSkipped && !!(mbtiSlots.e_i && mbtiSlots.s_n && mbtiSlots.t_f && mbtiSlots.j_p);
  const selectedMbti = hasMbti
    ? `${mbtiSlots.e_i}${mbtiSlots.s_n}${mbtiSlots.t_f}${mbtiSlots.j_p}`
    : '';
  const isValidToProceed = isMbtiSkipped || hasMbti;

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

  // ── Question Logic ──────────────────────────────────────────────────────
  const manualIndices = useMemo(() => {
    if (!hasMbti) return QUESTIONS.map((_, i) => i);
    const chars = selectedMbti.split('');
    return QUESTIONS.reduce<number[]>((acc, q, i) => {
      const hasAutoMatch = chars.some((char) => !!q.autochoice[char]);
      if (!hasAutoMatch) acc.push(i);
      return acc;
    }, []);
  }, [hasMbti, selectedMbti]);

  const actualIdx = manualIndices[currentIndex] ?? 0;
  const currentQuestion = QUESTIONS[actualIdx];
  const currentAnswer = answers[actualIdx];

  const handleSelectAnswer = (ans: string) => {
    const updated = [...answers];
    updated[actualIdx] = ans;
    setAnswers(updated);
  };

  const totalManual = manualIndices.length;
  const answeredCount = manualIndices.filter((idx) => !!answers[idx]).length;
  const isCurrentAnswered = !!currentAnswer;
  const allAnswered = answeredCount === totalManual;

  const handleNextQuestion = () => {
    if (currentIndex < totalManual - 1) {
      setCurrentIndex((p) => p + 1);
    } else if (allAnswered) {
      setStep('voice');
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) setCurrentIndex((p) => p - 1);
  };

  const progress = totalManual > 0 ? ((currentIndex + 1) / totalManual) * 100 : 100;
  const timerPercent = (recordingTime / MAX_RECORDING_SEC) * 100;

  // ── Final Finish Action ──────────────────────────────────────────────────
  const handleFinish = async () => {
    setStep('loading');
    // 답변이 있는 질문만 필터링하여 전송 데이터 최적화
    const qna = QUESTIONS.map((q, i) => ({ question: q.question, answer: answers[i] })).filter(
      (item) => item.answer && item.answer.trim() !== '',
    );

    if (nickname) {
      qna.unshift({
        question: '당신의 이름이 무엇인가요? 무슨 이름으로 불러드리면 좋을까요?',
        answer: `${nickname}으로 불러줘`,
      });
    }

    // 질문 답변이 하나도 없는지 체크 (AI 서버 min_length=1 대응)
    if (qna.length === 0) {
      alert('최소 하나 이상의 질문에 답변해 주세요.');
      setStep('questions');
      return;
    }

    try {
      // 대량의 AI 연산을 병렬로 실행하여 네트워크 탭에서 모든 요청을 확인할 수 있게 함
      const requests: Promise<unknown>[] = [postGeneratePrompt(qna)];

      if (audioBlob) {
        requests.push(postRegisterVoice(audioBlob, editableTranscript));
      }

      const results = await Promise.allSettled(requests);

      const promptResult = results[0];
      const voiceResult = results[1];

      // 모든 요청이 성공했는지 확인
      const isAllSuccess = results.every((res) => res.status === 'fulfilled');

      if (isAllSuccess) {
        // 성공 시 잠시 대기 후 이동
        setTimeout(() => {
          navigate(PATHS.HOME);
        }, 2000);
      } else {
        // 어느 하나라도 실패한 경우 로그 출력 및 에러 처리
        if (promptResult?.status === 'rejected') {
          console.error('[Tutorial] Prompt API failed:', promptResult.reason);
        }
        if (voiceResult?.status === 'rejected') {
          console.error('[Tutorial] Voice API failed:', voiceResult.reason);
        }

        throw new Error('일부 API 요청 실패');
      }
    } catch (err) {
      console.error('[Tutorial] AI registration failed:', err);
      alert('데이터 전송 중 오류가 발생했습니다. 네트워크 상태나 서버 로그를 확인해주세요.');
      setStep('voice'); // 마지막 단계로 되돌려 다시 제출할 기회 제공
    }
  };

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full min-h-screen overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start sm:justify-center p-4 bg-white">
      <div className="w-full max-w-2xl z-10 my-6 sm:my-0">
        {step !== 'loading' && <StepIndicator current={step} />}

        <AnimatePresence mode="wait">
          {step === 'mbti' && (
            <MbtiStep
              mbtiSlots={mbtiSlots}
              setMbtiSlots={setMbtiSlots}
              isMbtiSkipped={isMbtiSkipped}
              setIsMbtiSkipped={setIsMbtiSkipped}
              hasMbti={hasMbti}
              selectedMbti={selectedMbti}
              isValidToProceed={isValidToProceed}
              handleMbtiNext={handleMbtiNext}
            />
          )}

          {step === 'questions' && currentQuestion && (
            <QuestionStep
              currentIndex={currentIndex}
              totalManual={totalManual}
              answeredCount={answeredCount}
              progress={progress}
              currentQuestion={currentQuestion}
              currentAnswer={currentAnswer}
              handleSelectAnswer={handleSelectAnswer}
              handlePrevQuestion={handlePrevQuestion}
              handleNextQuestion={handleNextQuestion}
              isCurrentAnswered={isCurrentAnswered}
              allAnswered={allAnswered}
            />
          )}

          {step === 'voice' && (
            <VoiceStep
              voiceTopic={voiceTopic}
              voicePhase={voicePhase}
              recordingTime={recordingTime}
              finalTranscript={finalTranscript}
              interimTranscript={interimTranscript}
              editableTranscript={editableTranscript}
              setEditableTranscript={setEditableTranscript}
              startRecording={startRecording}
              stopRecording={stopRecording}
              handleFinish={handleFinish}
              timerPercent={timerPercent}
              waveDurations={waveDurations}
              setVoicePhase={setVoicePhase}
              setRecordingTime={setRecordingTime}
              setAudioBlob={setAudioBlob}
              setFinalTranscript={setFinalTranscript}
              MAX_RECORDING_SEC={MAX_RECORDING_SEC}
            />
          )}

          {step === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center text-center space-y-8"
            >
              <div className="relative">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[2rem] border border-white/40 shadow-2xl flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-gray-800 animate-spin" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -top-2 -right-2 p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl shadow-lg"
                >
                  <Sparkles className="w-4 h-4 text-white" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-gray-800">AI 페르소나 생성 중...</h2>
                <p className="text-gray-500 font-medium">
                  당신의 답변과 목소리를 학습하고 있습니다.
                  <br />
                  잠시만 기다려 주세요.
                </p>
              </div>

              <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 3, ease: 'easeInOut' }}
                  className="h-full bg-gradient-to-r from-gray-800 to-gray-600"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
