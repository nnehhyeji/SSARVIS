import { useState, useEffect, useCallback } from 'react';

// ─── useAICharacter ───
// 역할: 3D 캐릭터의 동작과 관련된 로직을 관리합니다.
// - 마이크 상태, 말하기 상태, 입 크기, 말풍선 텍스트, 캐릭터 얼굴 타입을 관리합니다.
// - 마이크 토글, 입 애니메이션, 표정 변경 등의 기능을 제공합니다.

export function useAICharacter() {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mouthOpenRadius, setMouthOpenRadius] = useState(2);
  const [triggerText, setTriggerText] = useState('');
  const [faceType, setFaceType] = useState(0);

  // 듀얼 AI 모드 (방문 시)를 위한 상태
  const [isMyAiSpeaking, setIsMyAiSpeaking] = useState(false);
  const [myMouthOpenRadius, setMyMouthOpenRadius] = useState(2);
  const [myTriggerText, setMyTriggerText] = useState('');

  const toggleMic = useCallback(() => {
    setIsMicOn((prev) => !prev);
  }, []);

  const changeFace = useCallback(() => {
    setFaceType((prev) => (prev + 1) % 6);
  }, []);

  // 입 애니메이션 (Main AI)
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

  // 입 애니메이션 (My AI - Dual Mode)
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

  // 초기 웰컴 메시지
  useEffect(() => {
    const timer = setTimeout(() => {
      setTriggerText('서영님 눈물닦고 할일하세요');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

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
    setMouthOpenRadius,
    setMyMouthOpenRadius,
  };
}
