import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Lock, Keyboard, ArrowRight } from 'lucide-react';
import { useVoiceLockStore } from '../../store/useVoiceLockStore';
import CharacterScene from '../features/character/CharacterScene';
import { useAICharacter } from '../../hooks/useAICharacter';
import authApi from '../../apis/authApi';
import { RefreshCw } from 'lucide-react';
import VoiceVisualizer from './VoiceVisualizer';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (event: Event) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: (event: Event) => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

interface CustomWindow extends Window {
  SpeechRecognition?: SpeechRecognitionStatic;
  webkitSpeechRecognition?: SpeechRecognitionStatic;
  webkitAudioContext?: typeof AudioContext;
}

const VoiceLockOverlay: React.FC = () => {
  const { isLocked, setIsLocked, lockPhrase } = useVoiceLockStore();
  const { faceType, mouthOpenRadius } = useAICharacter();

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [volume, setVolume] = useState(0);

  const [useTextInput, setUseTextInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isWrong, setIsWrong] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVerify = React.useCallback(
    async (phrase: string) => {
      if (isVerifying) return;
      setIsVerifying(true);
      setErrorMsg('');

      try {
        const response = await authApi.verifyVoiceLock({ voicePassword: phrase });
        if (response.data.checked) {
          setIsLocked(false);
          setUseTextInput(false);
        } else {
          setIsWrong(true);
          setErrorMsg('인증에 실패했습니다. 다시 시도해 주세요.');
          setTimeout(() => setIsWrong(false), 1000);
        }
      } catch (error) {
        console.error('Lock verification failed:', error);
        setErrorMsg('서버와 통신 중 오류가 발생했습니다.');
      } finally {
        setIsVerifying(false);
      }
    },
    [isVerifying, setIsLocked, setUseTextInput],
  );

  useEffect(() => {
    if (isLocked) {
      setInterimTranscript('');
      setInputValue('');
    }
  }, [isLocked]);

  useEffect(() => {
    if (!isLocked || useTextInput) {
      setVolume(0);
      return;
    }

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let stream: MediaStream | null = null;
    let animationId: number;

    const startAudio = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const Win = window as unknown as CustomWindow;
        audioContext = new (window.AudioContext || Win.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((acc, v) => acc + v, 0) / dataArray.length;
          setVolume(avg);
          animationId = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      } catch (err) {
        console.error('Audio analysis error:', err);
      }
    };

    startAudio();

    return () => {
      cancelAnimationFrame(animationId);
      stream?.getTracks().forEach((t) => t.stop());
      audioContext?.close();
    };
  }, [isLocked, useTextInput]);

  useEffect(() => {
    if (!isLocked || useTextInput) return;

    // Check for webkitSpeechRecognition
    const Win = window as unknown as CustomWindow;
    const SpeechRecognition = Win.SpeechRecognition || Win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('이 브라우저는 음성 인식을 지원하지 않습니다.');
      setUseTextInput(true); // Auto fallback if not supported
      return;
    }

    let isActive = true;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ko-KR';

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMsg('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // 2초(2000ms) 동안 침묵이 흐르면 입력을 지우고 세션을 초기화하는 타이머
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(() => {
        if (isActive && isLocked && !useTextInput) {
          setInterimTranscript('');
          try {
            recognition.stop();
          } catch {
            // Ignore stop errors
          }
        }
      }, 2000);

      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const finalPhrase = event.results[i][0].transcript;
          setInterimTranscript(finalPhrase);
          handleVerify(finalPhrase);
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }
      if (currentInterim) {
        setInterimTranscript(currentInterim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Ignore 'aborted' errors that happen during cleanup or minor browser interruptions
      if (!isActive || event.error === 'aborted') return;

      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setErrorMsg('마이크 권한이 필요합니다.');
      }
    };

    recognition.onend = () => {
      // Don't restart if the effect has been cleaned up
      if (!isActive) return;

      if (isLocked && !useTextInput) {
        try {
          // Add a small delay to prevent rapid restart loops and browser throttling
          setTimeout(() => {
            if (isActive && isLocked && !useTextInput) {
              recognition.start();
            }
          }, 100);
        } catch (e) {
          console.error('Failed to restart recognition:', e);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      isActive = false;
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      try {
        recognition.stop();
      } catch {
        // Already stopped or failed to stop
      }
    };
  }, [isLocked, lockPhrase, setIsLocked, useTextInput, handleVerify]);

  const handleTextUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    handleVerify(inputValue.trim());
    setInputValue('');
  };

  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Dynamic Background with Blur and Dark Overlay */}
          <div className="absolute inset-0 bg-[#0A0A0B]/85 backdrop-blur-[50px]" />

          {/* Concentric Glow Circles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
            <div className="w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[80px] animate-pulse delay-700" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-10 max-w-xl w-full px-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 bg-white/5 rounded-3xl backdrop-blur-xl border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
                <Lock className="w-10 h-10 text-white/50" />
              </div>
              <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Voice Lock</h2>
              <p className="text-white/40 font-medium">비밀 문구를 통해 잠금을 해제하세요.</p>
            </motion.div>

            {/* AI Character Space */}
            {!useTextInput && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-64 h-64 relative group"
              >
                <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />
                <CharacterScene
                  faceType={faceType}
                  mouthOpenRadius={mouthOpenRadius}
                  mode="normal"
                  isLockMode={true}
                  isSpeaking={false}
                  isMicOn={true}
                />
                {isListening && (
                  <div className="absolute -inset-4 rounded-full border border-white/5 animate-ping opacity-20" />
                )}
              </motion.div>
            )}

            {/* Recognition Status or Text Input */}
            <div className="flex flex-col items-center gap-6 w-full">
              {!useTextInput ? (
                <div className="flex flex-col items-center w-full">
                  <span className="text-xs font-black tracking-[0.4em] uppercase text-white/20 mb-4 italic">
                    Listening for Secret Phrase
                  </span>
                  <div className="px-10 py-12 bg-white/5 border border-white/10 rounded-[60px] backdrop-blur-2xl shadow-inner mb-6 flex flex-col items-center gap-10 min-w-[340px] justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-500/5 opacity-10" />
                    <VoiceVisualizer isActive={isListening} volume={volume} />
                    <span className="text-2xl font-bold text-white/90 tracking-tight text-center max-w-sm break-keep leading-relaxed relative z-10">
                      {interimTranscript || '비밀 문구를 말씀하세요'}
                    </span>
                  </div>

                  <div className="h-10 flex items-center justify-center text-white/40 font-medium italic mb-2">
                    {!interimTranscript && (
                      <div className="flex items-center gap-3">
                        <Mic className="w-5 h-5 text-indigo-400" />
                        <span>음성 인식 대기 중...</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setUseTextInput(true)}
                    className="flex items-center gap-2 text-white/20 hover:text-white/50 transition-colors text-sm font-bold mt-4"
                  >
                    <Keyboard className="w-4 h-4" />
                    <span>텍스트로 입력하기</span>
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-sm"
                >
                  <div className="text-center mb-6">
                    <span className="text-xs font-black tracking-[0.4em] uppercase text-white/20 mb-2 block">
                      Security Access
                    </span>
                    <h3 className="text-xl font-bold text-white/80 tracking-tight">
                      비밀 문구를 입력하세요
                    </h3>
                  </div>

                  <form
                    onSubmit={handleTextUnlock}
                    className={`relative flex items-center border rounded-3xl p-2 transition-all duration-300 ${
                      isWrong
                        ? 'border-red-500 bg-red-500/10 translate-x-2'
                        : 'border-white/10 bg-white/5 focus-within:border-indigo-500/50 focus-within:bg-white/10'
                    }`}
                  >
                    <input
                      autoFocus
                      disabled={isVerifying}
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="비밀 문구 입력..."
                      className="bg-transparent border-none text-white px-4 py-3 w-full focus:outline-none font-bold text-lg placeholder:text-white/10 tracking-normal disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="p-3 bg-indigo-500 text-white rounded-2xl hover:bg-indigo-400 transition-colors shadow-lg disabled:bg-gray-700"
                    >
                      {isVerifying ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <ArrowRight className="w-5 h-5" />
                      )}
                    </button>
                  </form>

                  <button
                    onClick={() => {
                      setUseTextInput(false);
                      setErrorMsg('');
                    }}
                    className="w-full text-white/20 hover:text-white/50 transition-colors text-sm font-bold mt-8 flex items-center justify-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    <span>다시 음성으로 해제</span>
                  </button>
                </motion.div>
              )}

              {errorMsg && !useTextInput && (
                <div className="px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 font-bold text-sm">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Hint for Dev/Testing */}
            <button
              onClick={() => setIsLocked(false)}
              className="mt-4 text-white/10 hover:text-white/20 transition-colors text-[10px] font-black uppercase tracking-widest"
            >
              Emergency Manual Unlock
            </button>
          </div>

          <div className="absolute bottom-12 inset-x-0 flex justify-center opacity-30">
            <div className="flex items-center gap-1.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40" />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceLockOverlay;
