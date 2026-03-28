import { useState, useEffect, useCallback } from 'react';

interface UseAICharacterOptions {
  enableDefaultTriggerText?: boolean;
}

export function useAICharacter({ enableDefaultTriggerText = true }: UseAICharacterOptions = {}) {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mouthOpenRadius, setMouthOpenRadius] = useState(2);
  const [triggerText, setTriggerText] = useState('');
  const [faceType, setFaceType] = useState(0);

  const [isMyAiSpeaking, setIsMyAiSpeaking] = useState(false);
  const [myMouthOpenRadius, setMyMouthOpenRadius] = useState(2);
  const [myTriggerText, setMyTriggerText] = useState('');

  const toggleMic = useCallback(() => {
    setIsMicOn((prev) => !prev);
  }, []);

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
    setIsMicOn,
    setMouthOpenRadius,
    setMyMouthOpenRadius,
  };
}
