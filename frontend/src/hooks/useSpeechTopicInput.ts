import { useCallback, useEffect, useRef, useState } from 'react';
import { useMicrophonePermission } from './useMicrophonePermission';

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal?: boolean;
  0: SpeechRecognitionResultItem;
  length: number;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResult>;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type TopicInputPhase = 'idle' | 'recording' | 'review';

interface TopicInputState {
  phase: TopicInputPhase;
  recordingTime: number;
  finalTranscript: string;
  interimTranscript: string;
  editableTranscript: string;
  isSupported: boolean;
  errorMessage: string;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
  setEditableTranscript: (value: string) => void;
}

const MAX_RECORDING_SEC = 20;

export function useSpeechTopicInput(): TopicInputState {
  const [phase, setPhase] = useState<TopicInputPhase>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [editableTranscript, setEditableTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const { getStream } = useMicrophonePermission();

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const phaseRef = useRef<TopicInputPhase>('idle');

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch {
      // 브라우저 상태에 따라 stop이 실패할 수 있으므로 무시한다.
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    stopRecognition();
    cleanupMedia();
    recognitionRef.current = null;
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    setPhase('idle');
    phaseRef.current = 'idle';
    setRecordingTime(0);
    setFinalTranscript('');
    setInterimTranscript('');
    setEditableTranscript('');
    setErrorMessage('');
  }, [clearTimer, cleanupMedia, stopRecognition]);

  const stopRecording = useCallback(() => {
    if (phase !== 'recording') return;

    clearTimer();
    stopRecognition();
    cleanupMedia();
    setRecordingTime((prev) => prev);

    const transcript = `${finalTranscriptRef.current} ${interimTranscriptRef.current}`.trim();
    setFinalTranscript(finalTranscriptRef.current.trim());
    setInterimTranscript('');
    setEditableTranscript(transcript);
    setPhase('review');
    phaseRef.current = 'review';
  }, [cleanupMedia, clearTimer, phase, stopRecognition]);

  const startRecording = useCallback(async () => {
    setErrorMessage('');

    const SpeechRecognitionApi =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognition })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setIsSupported(false);
      setErrorMessage('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }

    setIsSupported(true);

    const stream = await getStream();
    if (!stream) {
      setErrorMessage('마이크 권한이 필요합니다.');
      return;
    }
    streamRef.current = stream;

    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    setFinalTranscript('');
    setInterimTranscript('');
    setEditableTranscript('');
    setRecordingTime(0);
    setPhase('recording');
    phaseRef.current = 'recording';

    const recognition = new SpeechRecognitionApi();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let nextFinal = finalTranscriptRef.current;
      let nextInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript || '';

        if (result?.isFinal) {
          nextFinal += `${transcript} `;
        } else {
          nextInterim += transcript;
        }
      }

      finalTranscriptRef.current = nextFinal;
      interimTranscriptRef.current = nextInterim;
      setFinalTranscript(nextFinal.trim());
      setInterimTranscript(nextInterim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted') return;
      setErrorMessage(`음성 인식 중 오류가 발생했습니다: ${event.error}`);
    };

    recognition.onend = () => {
      if (phaseRef.current === 'recording') {
        const transcript = `${finalTranscriptRef.current} ${interimTranscriptRef.current}`.trim();
        setEditableTranscript(transcript);
        setFinalTranscript(finalTranscriptRef.current.trim());
        setInterimTranscript('');
        setPhase('review');
        phaseRef.current = 'review';
        cleanupMedia();
        clearTimer();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();

    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        const next = prev + 1;
        if (next >= MAX_RECORDING_SEC) {
          clearTimer();
          stopRecognition();
          cleanupMedia();
          return MAX_RECORDING_SEC;
        }
        return next;
      });
    }, 1000);
  }, [cleanupMedia, clearTimer, getStream, stopRecognition]);

  useEffect(() => {
    return () => {
      clearTimer();
      cleanupMedia();
      stopRecognition();
    };
  }, [cleanupMedia, clearTimer, stopRecognition]);

  return {
    phase,
    recordingTime,
    finalTranscript,
    interimTranscript,
    editableTranscript,
    isSupported,
    errorMessage,
    startRecording,
    stopRecording,
    reset,
    setEditableTranscript,
  };
}
