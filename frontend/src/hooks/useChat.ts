import { useState, useCallback } from 'react';
import type { ChatMessage } from '../types';

// ─── useChat ───
// 역할: 채팅 메시지 및 시크릿(잠금) 모드 상태를 관리합니다.
// - 메시지 전송, 잠금 모드 토글, 대화 내역 백업/복원 기능을 제공합니다.

export function useChat() {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: '안녕하세요! 무엇을 도와드릴까요?' },
  ]);
  const [backupMessages, setBackupMessages] = useState<ChatMessage[] | null>(null);
  const [isLockMode, setIsLockMode] = useState(false);

  const toggleLock = useCallback(() => {
    if (!isLockMode) {
      // 일반 -> 시크릿 모드 전환 시 기존 대화 백업 및 초기화
      setBackupMessages(chatMessages);
      setChatMessages([
        { sender: 'ai', text: '시크릿 모드가 활성화되었습니다. 이 대화는 저장되지 않습니다.' },
      ]);
    } else {
      // 시크릿 -> 일반 모드 전환 시 기존 대화 복원
      if (backupMessages) {
        setChatMessages(backupMessages);
        setBackupMessages(null);
      } else {
        setChatMessages([{ sender: 'ai', text: '안녕하세요! 무엇을 도와드릴까요?' }]);
      }
    }
    setIsLockMode((prev) => !prev);
  }, [isLockMode, chatMessages, backupMessages]);

  const sendMessage = useCallback(
    (text: string, isVisitorMode: boolean, visitedFollowName: string) => {
      if (!text.trim()) return;

      setChatMessages((prev) => [...prev, { sender: 'me', text }]);
      setChatInput('');

      // AI 응답 시뮬레이션
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: isVisitorMode
              ? `${visitedFollowName}: 반가워요! 타이핑으로도 대화할 수 있어요.`
              : 'AI: 네, 듣고 있어요. 무엇이든 물어보세요!',
          },
        ]);
      }, 1000);
    },
    [],
  );

  return {
    chatInput,
    chatMessages,
    isLockMode,
    setChatInput,
    setChatMessages,
    toggleLock,
    sendMessage,
  };
}
