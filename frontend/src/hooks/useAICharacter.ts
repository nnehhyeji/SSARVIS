import { useState, useEffect, useCallback } from 'react';
import { useMicStore } from '../store/useMicStore';

interface UseAICharacterOptions {
  enableDefaultTriggerText?: boolean;
}

export function useAICharacter({ enableDefaultTriggerText = true }: UseAICharacterOptions = {}) {
  const isMicOn = useMicStore((state) => state.micRuntimeActive);
  const micPreferenceEnabled = useMicStore((state) => state.micPreferenceEnabled);
  const setMicPreferenceEnabled = useMicStore((state) => state.setMicPreferenceEnabled);
  const setMicRuntimeActive = useMicStore((state) => state.setMicRuntimeActive);
  const syncMicState = useMicStore((state) => state.syncMicState);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mouthOpenRadius, setMouthOpenRadius] = useState(2);
  const [triggerText, setTriggerText] = useState('');
  const [faceType, setFaceType] = useState(0);

  const [isMyAiSpeaking, setIsMyAiSpeaking] = useState(false);
  const [myMouthOpenRadius, setMyMouthOpenRadius] = useState(2);
  const [myTriggerText, setMyTriggerText] = useState('');

  const toggleMic = useCallback(() => {
    syncMicState(!isMicOn);
  }, [isMicOn, syncMicState]);

  const changeFace = useCallback(() => {
    setFaceType((prev) => (prev + 1) % 6);
  }, []);

  useEffect(() => {
    if (!isSpeaking) return;

    const ani = setInterval(() => {
      setMouthOpenRadius((prev) => (prev === 2 ? 8 : 2));
    }, 150);

    return () => {
      clearInterval(ani);
      setMouthOpenRadius(2);
    };
  }, [isSpeaking]);

  useEffect(() => {
    if (!isMyAiSpeaking) return;

    const ani = setInterval(() => {
      setMyMouthOpenRadius((prev) => (prev === 2 ? 8 : 2));
    }, 150);

    return () => {
      clearInterval(ani);
      setMyMouthOpenRadius(2);
    };
  }, [isMyAiSpeaking]);

  useEffect(() => {
    if (!enableDefaultTriggerText) return;

    const timer = setTimeout(() => {
      setTriggerText('지금처럼 자연스럽게 말을 걸어줘');
    }, 2000);

    return () => clearTimeout(timer);
  }, [enableDefaultTriggerText]);

  return {
    isMicOn,
    micPreferenceEnabled,
    isSpeaking,
    mouthOpenRadius,
    triggerText,
    faceType,
    isMyAiSpeaking,
    myMouthOpenRadius,
    myTriggerText,
    toggleMic,
    changeFace,
    setTriggerText,
    setMyTriggerText,
    setIsSpeaking,
    setIsMyAiSpeaking,
    setIsMicOn: setMicRuntimeActive,
    setMicPreferenceEnabled,
    setMicRuntimeActive,
    setMouthOpenRadius,
    setMyMouthOpenRadius,
  };
}
