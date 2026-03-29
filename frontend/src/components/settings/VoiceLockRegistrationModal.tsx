import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, ChevronRight, Check, RefreshCw, Edit2, ShieldCheck, Keyboard } from 'lucide-react';
import { useVoiceLockStore } from '../../store/useVoiceLockStore';
import { useMicrophonePermission } from '../../hooks/useMicrophonePermission';
import VoiceVisualizer from '../common/VoiceVisualizer';
import CharacterScene from '../features/character/CharacterScene';
import { useAICharacter } from '../../hooks/useAICharacter';
import authApi from '../../apis/authApi';
import type {
  SpeechRecognitionErrorEvent,
  SpeechRecognitionEvent,
  SpeechRecognitionType,
} from '../../pages/auth/tutorialConstants';

interface VoiceLockRegistrationModalProps {
  onClose: () => void;
}

type Step = 'intro' | 'recording' | 'confirm' | 'edit' | 'success';

type CustomWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const VoiceLockRegistrationModal: React.FC<VoiceLockRegistrationModalProps> = ({ onClose }) => {
  const { setIsVoiceLockRegistered, setVoiceLockEnabled, timeoutDuration } = useVoiceLockStore();
  const { faceType, mouthOpenRadius } = useAICharacter();
  const { getStream } = useMicrophonePermission();

  const [step, setStep] = useState<Step>('intro');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const skipNextOnEndRef = useRef(false);

  const stopRecording = React.useCallback(() => {
    setIsRecognitionActive(false);

    if (recognitionRef.current) {
      skipNextOnEndRef.current = true;
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
      recognitionRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setVolume(0);
  }, []);

  // Stop recording when step changes or component unmounts
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  const startRecording = async () => {
    skipNextOnEndRef.current = false;
    stopRecording();
    setErrorMsg('');
    setTranscript('');
    setInterimTranscript('');

    // Check SpeechRecognition support
    const Win = window as unknown as CustomWindow;
    const SpeechRecognition = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg('이 브라우저는 음성 인식을 지원하지 않습니다.');
      setStep('edit'); // Fallback to manual input
      return;
    }

    try {
      // 1. Setup Audio Volume Visualizer
      const stream = await getStream();
      if (!stream) {
        setErrorMsg('마이크 권한이 필요합니다.');
        return;
      }
      streamRef.current = stream;
      const Win2 = window as unknown as CustomWindow;
      audioContextRef.current = new (window.AudioContext || Win2.webkitAudioContext)();
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 64;
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyser || !streamRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((acc: number, v: number) => acc + v, 0) / dataArray.length;
        setVolume(avg);
        requestAnimationFrame(updateVolume);
      };

      // 2. Setup Speech Recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'ko-KR';

      recognition.onstart = () => {
        setIsRecognitionActive(true);
        updateVolume();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setTranscript(event.results[i][0].transcript);
          } else {
            interimText += event.results[i][0].transcript;
          }
        }
        setInterimTranscript(interimText);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('STT Error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMsg('마이크 권한이 거부되었습니다.');
        } else {
          setErrorMsg('오류가 발생했습니다. 다시 시도해 주세요.');
        }
        stopRecording();
      };

      recognition.onend = () => {
        if (skipNextOnEndRef.current) {
          skipNextOnEndRef.current = false;
          return;
        }
        stopRecording();
        // If we have a final transcript, move to confirm
        setStep((prev) => (prev === 'recording' ? 'confirm' : prev));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Mic access error:', err);
      setErrorMsg('마이크 접근 중 오류가 발생했습니다.');
      setStep('edit');
    }
  };

  const handleComplete = async () => {
    if (!transcript.trim()) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      await authApi.setupVoiceLock({
        voicePassword: transcript.trim(),
        timeout: timeoutDuration,
      });
      stopRecording();
      setIsVoiceLockRegistered(true);
      setVoiceLockEnabled(true);
      setStep('success');
    } catch (error) {
      console.error('Failed to setup voice lock:', error);
      setErrorMsg('서버에 등록하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const retryRecording = () => {
    stopRecording();
    setStep('recording');
    void startRecording();
  };

  // --- Step Components ---

  const renderIntro = () => (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-2">
        <Mic className="w-10 h-10 text-indigo-500" />
      </div>
      <div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">음성 잠금 등록을 시작합니다.</h3>
        <p className="text-gray-500 font-medium leading-relaxed max-w-xs">
          나의 목소리로 보안 문구를 설정하여 <br /> 서비스를 안전하게 보호하세요.
        </p>
      </div>
      <button
        onClick={() => {
          stopRecording();
          setStep('recording');
          void startRecording();
        }}
        className="mt-4 w-full py-5 bg-indigo-500 text-white rounded-2xl font-black text-xl hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group"
      >
        <span>시작하기</span>
        <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
      </button>
      <button
        onClick={() => {
          stopRecording();
          setStep('edit');
        }}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-600 font-bold text-sm transition-colors"
      >
        <Keyboard className="w-4 h-4" />
        <span>텍스트로 바로 입력하기</span>
      </button>
    </div>
  );

  const renderRecording = () => (
    <div className="flex flex-col items-center text-center gap-8 py-4">
      <div className="text-center">
        <h3 className="text-2xl font-black text-gray-900 mb-2">사용할 음성을 입력해주세요.</h3>
        <p className="text-indigo-500 font-bold text-sm">
          비밀스럽고 기억하기 쉬운 문장이 좋습니다.
        </p>
      </div>

      <div className="w-48 h-48 relative">
        <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-2xl" />
        <CharacterScene
          faceType={faceType}
          mouthOpenRadius={mouthOpenRadius}
          mode="normal"
          isLockMode={true}
          isSpeaking={false}
          isMicOn={true}
        />
      </div>

      <div className="w-full space-y-4">
        <div className="flex justify-center h-12">
          <VoiceVisualizer isActive={isRecognitionActive} volume={volume} />
        </div>
        <div className="min-h-[80px] p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-center">
          <span
            className={`text-xl font-bold ${interimTranscript ? 'text-gray-800' : 'text-gray-400'}`}
          >
            {interimTranscript || '말씀하세요...'}
          </span>
        </div>
      </div>

      <button
        onClick={stopRecording}
        className="text-gray-400 hover:text-red-500 font-bold transition-colors"
      >
        취소
      </button>
    </div>
  );

  const renderConfirm = () => (
    <div className="flex flex-col items-center text-center gap-8 py-4 w-full">
      <div className="text-center">
        <h3 className="text-2xl font-black text-gray-900 mb-2">이 문장이 맞나요?</h3>
        <p className="text-gray-400 font-medium">인식된 문장을 확인해 주세요.</p>
      </div>

      <div className="w-full p-8 bg-indigo-50 rounded-[40px] border-2 border-indigo-100 relative group overflow-hidden">
        <div className="relative z-10">
          <span className="text-3xl font-black text-indigo-600 underline decoration-indigo-200 underline-offset-8">
            "{transcript}"
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 w-full gap-3">
        <button
          onClick={handleComplete}
          className="w-full py-5 bg-indigo-500 text-white rounded-2xl font-black text-xl hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
        >
          <Check className="w-6 h-6" />
          <span>네, 이 문장으로 사용할게요</span>
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={retryRecording}
            className="py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>다시 말하기</span>
          </button>
          <button
            onClick={() => {
              stopRecording();
              setStep('edit');
            }}
            className="py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            <span>직접 수정하기</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderEdit = () => (
    <div className="flex flex-col items-center text-center gap-8 py-4 w-full">
      <div className="text-center">
        <h3 className="text-2xl font-black text-gray-900 mb-2">잠금 문구 입력</h3>
        <p className="text-gray-400 font-medium">사용하실 문구를 직접 입력해 주세요.</p>
      </div>

      <div className="w-full">
        <input
          autoFocus
          type="text"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="예: 우리집 강아지 뽀삐"
          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-5 font-black text-2xl text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-indigo-500/30 focus:bg-white transition-all"
        />
      </div>

      <button
        onClick={handleComplete}
        disabled={!transcript.trim() || isLoading}
        className="w-full py-5 bg-indigo-500 text-white rounded-2xl font-black text-xl hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100 disabled:bg-gray-200 disabled:shadow-none flex items-center justify-center gap-2"
      >
        {isLoading && <RefreshCw className="w-5 h-5 animate-spin" />}
        <span>{isLoading ? '등록 중...' : '등록 완료'}</span>
      </button>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center text-center gap-8 py-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 10 }}
        className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center"
      >
        <ShieldCheck className="w-12 h-12 text-green-500" />
      </motion.div>
      <div>
        <h3 className="text-3xl font-black text-gray-900 mb-4">등록 완료되었습니다!</h3>
        <p className="text-gray-500 font-medium leading-relaxed">
          이중잠금을 통해 <br /> 나만의 AI를 안전하게 관리하세요.
        </p>
      </div>
      <button
        onClick={() => {
          stopRecording();
          onClose();
        }}
        className="mt-4 w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-xl hover:bg-black transition-all shadow-xl shadow-gray-200"
      >
        확인
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => {
          stopRecording();
          onClose();
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-lg rounded-[48px] shadow-2xl overflow-hidden focus:outline-none"
      >
        <button
          onClick={() => {
            stopRecording();
            onClose();
          }}
          className="absolute top-8 right-8 p-2 rounded-2xl bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all z-20"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="px-10 py-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 'intro' && renderIntro()}
              {step === 'recording' && renderRecording()}
              {step === 'confirm' && renderConfirm()}
              {step === 'edit' && renderEdit()}
              {step === 'success' && renderSuccess()}
            </motion.div>
          </AnimatePresence>
        </div>

        {errorMsg && (
          <div className="px-10 pb-10">
            <div className="p-4 rounded-2xl bg-red-50 text-red-500 text-sm font-bold flex items-center justify-center gap-2">
              <span>⚠️ {errorMsg}</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VoiceLockRegistrationModal;
