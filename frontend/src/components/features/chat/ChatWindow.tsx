import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Camera, Share2, X } from 'lucide-react';

import type { ChatMessage } from '../../../types';

// ─── ChatWindow ───
// 역할: 화면 하단 슬라이드업 채팅 창 UI
// - isVisible: 마이크가 꺼졌을 때만 표시됩니다.
// - messages: 현재 세션의 대화 내역 목록을 출력합니다.
// - 자동 스크롤 로직(chatContainerRef)이 포함되어 있습니다.

interface ChatWindowProps {
  isVisible: boolean;
  messages: ChatMessage[];
  input: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onClose?: () => void;
}

export default function ChatWindow({
  isVisible,
  messages,
  input,
  onInputChange,
  onSend,
  onClose,
}: ChatWindowProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 채팅 자동 스크롤
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  return (
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[50%] bg-white/60 backdrop-blur-2xl rounded-t-[40px] shadow-2xl border border-white/40 flex flex-col z-30"
      initial={{ y: '100%' }}
      animate={{ y: isVisible ? '0%' : '100%' }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
    >
      {/* 헤더 영역 */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/30 bg-white/20">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
          대화 내역
        </h2>
        <div className="flex items-center gap-3">
          <button
            className="p-2 rounded-xl bg-white/40 hover:bg-white/60 transition-all text-gray-600"
            title="대화 캡쳐"
            onClick={() => alert('대화를 캡쳐합니다. (html2canvas 등 라이브러리 연동 필요)')}
          >
            <Camera className="w-5 h-5" />
          </button>
          <button
            className="p-2 rounded-xl bg-white/40 hover:bg-white/60 transition-all text-gray-600"
            title="공유하기"
            onClick={() => alert('공유하기 기능을 실행합니다. (Web Share API 등 사용)')}
          >
            <Share2 className="w-5 h-5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-100/50 hover:bg-gray-200/50 transition-all text-gray-500 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 메시지 영역 */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 custom-scrollbar"
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[70%] p-4 rounded-3xl text-sm font-medium shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 ${
                msg.sender === 'me'
                  ? 'bg-pink-400 text-white rounded-tr-none'
                  : 'bg-green-100 text-gray-800 rounded-tl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* 입력창 영역 */}
      <div className="p-6 border-t border-white/30 bg-white/40">
        <div className="relative flex items-center gap-3 bg-white/80 rounded-2xl p-2 px-4 shadow-inner border border-white/50">
          <input
            type="text"
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-transparent border-none outline-none py-2 text-gray-800 placeholder-gray-400 text-sm"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
          />
          <button
            onClick={onSend}
            className={`p-2 rounded-xl transition ${
              input.trim() ? 'bg-pink-400 text-white shadow-md' : 'text-gray-400'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
