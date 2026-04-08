import { useCallback } from 'react';
import type { MutableRefObject } from 'react';

import {
  SPEECH_LISTENING_TEXT,
  WAKE_DETECTED_TEXT,
} from './useChatCopy';
import {
  containsChatWakeWord,
  extractChatSpeechAfterWakeWord,
  matchChatHomeRouteCommand,
  matchChatRouteCommand,
} from './useChatCommands';

interface WebSpeechRecognitionResultItem {
  transcript: string;
}

interface WebSpeechRecognitionResult {
  0: WebSpeechRecognitionResultItem;
  length: number;
}

interface WebSpeechRecognitionEvent {
  results: ArrayLike<WebSpeechRecognitionResult>;
}

interface WebSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
}

interface ChatRecordingOptionsLike {
  sessionId: string | null;
}

interface UseChatSpeechCaptureOptions {
  recognitionRef: MutableRefObject<WebSpeechRecognition | null>;
  currentRecordingOptionsRef: MutableRefObject<ChatRecordingOptionsLike | null>;
  isSubmittingSpeechTurnRef: MutableRefObject<boolean>;
  speechSessionIdRef: MutableRefObject<number>;
  recognitionModeRef: MutableRefObject<string>;
  speechTurnCompletedRef: MutableRefObject<boolean>;
  finalizeSpeechOnEndRef: MutableRefObject<boolean>;
  hasDetectedSpeechRef: MutableRefObject<boolean>;
  sttTextRef: MutableRefObject<string>;
  pendingSpeechSeedRef: MutableRefObject<string>;
  lastSpeechTimeRef: MutableRefObject<number>;
  clearTranscriptTimer: () => void;
  clearSpeechSilenceTimer: () => void;
  stopSilenceMonitor: () => void;
  startSilenceMonitor: (sessionId: number) => void;
  ensureSocketReady: () => Promise<void>;
  safeStartRecognition: () => void;
  setVoicePhase: (phase: 'speech') => void;
  setSttText: (text: string) => void;
  updateVoiceStatus: (text: string) => void;
  stopRecognition: () => void;
  navigate: (to: string) => void;
  userId?: number | null;
}

export function useChatSpeechCapture({
  recognitionRef,
  currentRecordingOptionsRef,
  isSubmittingSpeechTurnRef,
  speechSessionIdRef,
  recognitionModeRef,
  speechTurnCompletedRef,
  finalizeSpeechOnEndRef,
  hasDetectedSpeechRef,
  sttTextRef,
  pendingSpeechSeedRef,
  lastSpeechTimeRef,
  clearTranscriptTimer,
  clearSpeechSilenceTimer,
  stopSilenceMonitor,
  startSilenceMonitor,
  ensureSocketReady,
  safeStartRecognition,
  setVoicePhase,
  setSttText,
  updateVoiceStatus,
  stopRecognition,
  navigate,
  userId,
}: UseChatSpeechCaptureOptions) {
  return useCallback(
    async (initialText: string = '') => {
      if (!recognitionRef.current || !currentRecordingOptionsRef.current) {
        console.log('[speech] no recognition or options, aborting');
        return;
      }
      if (isSubmittingSpeechTurnRef.current) {
        console.log('[speech] already submitting, aborting');
        return;
      }

      const sessionId = speechSessionIdRef.current + 1;
      speechSessionIdRef.current = sessionId;

      recognitionModeRef.current = 'speech';
      setVoicePhase('speech');
      speechTurnCompletedRef.current = false;
      finalizeSpeechOnEndRef.current = false;

      console.log('[speech] === startSpeechCapture ===', { sessionId, initialText });

      void ensureSocketReady();

      clearTranscriptTimer();
      clearSpeechSilenceTimer();
      stopSilenceMonitor();
      hasDetectedSpeechRef.current = !!initialText.trim();
      sttTextRef.current = initialText.trim();
      if (initialText.trim()) {
        setSttText(initialText.trim());
        updateVoiceStatus(initialText.trim());
      } else {
        setSttText(SPEECH_LISTENING_TEXT);
      }

      startSilenceMonitor(sessionId);

      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: WebSpeechRecognitionEvent) => {
        if (sessionId !== speechSessionIdRef.current) return;
        if (recognitionModeRef.current !== 'speech') return;
        if (isSubmittingSpeechTurnRef.current) return;

        let transcript = '';
        for (let i = 0; i < event.results.length; i += 1) {
          transcript += event.results[i]?.[0]?.transcript || '';
        }

        if (containsChatWakeWord(transcript)) {
          const commandText = extractChatSpeechAfterWakeWord(transcript);
          const routeAfterWakeWord =
            matchChatRouteCommand(commandText) ||
            matchChatHomeRouteCommand(commandText, userId);

          pendingSpeechSeedRef.current = '';
          hasDetectedSpeechRef.current = false;
          sttTextRef.current = '';

          if (routeAfterWakeWord) {
            stopSilenceMonitor();
            clearSpeechSilenceTimer();
            setSttText('');
            updateVoiceStatus(WAKE_DETECTED_TEXT);
            stopRecognition();
            navigate(routeAfterWakeWord);
            return;
          }

          const restartedText = commandText.trim();
          hasDetectedSpeechRef.current = !!restartedText;
          sttTextRef.current = restartedText;
          setSttText(restartedText || SPEECH_LISTENING_TEXT);
          updateVoiceStatus(restartedText || WAKE_DETECTED_TEXT);
          lastSpeechTimeRef.current = Date.now();
          return;
        }

        const seedText = pendingSpeechSeedRef.current.trim();
        const normalizedText = [seedText, transcript.trim()].filter(Boolean).join(' ').trim();
        if (!normalizedText) return;

        console.log('[speech] onresult', { normalizedText });

        hasDetectedSpeechRef.current = true;
        setSttText(normalizedText);
        sttTextRef.current = normalizedText;
        updateVoiceStatus(normalizedText);
        lastSpeechTimeRef.current = Date.now();
      };

      console.log('[speech] starting recognition engine');
      safeStartRecognition();
    },
    [
      clearSpeechSilenceTimer,
      clearTranscriptTimer,
      currentRecordingOptionsRef,
      ensureSocketReady,
      finalizeSpeechOnEndRef,
      hasDetectedSpeechRef,
      isSubmittingSpeechTurnRef,
      lastSpeechTimeRef,
      navigate,
      pendingSpeechSeedRef,
      recognitionModeRef,
      recognitionRef,
      safeStartRecognition,
      setSttText,
      setVoicePhase,
      speechSessionIdRef,
      speechTurnCompletedRef,
      startSilenceMonitor,
      stopRecognition,
      stopSilenceMonitor,
      sttTextRef,
      updateVoiceStatus,
      userId,
    ],
  );
}
