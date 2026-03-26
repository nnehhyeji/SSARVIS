import React from 'react';
import type { ChatMessageData } from '../../../apis/chatApi';

interface ChatHistoryViewProps {
  selectedChatId: string | null;
  chatMessagesData: ChatMessageData[];
  isChatLoading: boolean;
}

const ChatHistoryView: React.FC<ChatHistoryViewProps> = ({
  selectedChatId,
  chatMessagesData,
  isChatLoading,
}) => {
  return (
    <div className="absolute left-[500px] right-0 h-full bg-white pointer-events-auto shadow-2xl overflow-hidden flex flex-col z-[110]">
      {/* Top Right Profile (Fixed like in image) */}
      <div className="absolute top-8 right-8 z-10">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=MainUser" alt="Main User" />
        </div>
      </div>

      {selectedChatId === null ? (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="w-24 h-24 rounded-full border-2 border-gray-800 flex items-center justify-center -rotate-12">
            <svg
              viewBox="0 0 24 24"
              className="w-12 h-12 text-gray-800 fill-none stroke-current stroke-2"
            >
              <path
                d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-xl font-bold text-gray-400">ai 와 대화를 나누어보세요 !</p>
        </div>
      ) : (
        /* Chat History View */
        <div className="flex-1 flex flex-col gap-20 overflow-y-auto w-full pt-10">
          {chatMessagesData.length === 0 && !isChatLoading ? (
            <div className="py-20 text-center font-bold text-gray-400 uppercase tracking-widest text-sm opacity-50">
              메시지 내역이 없습니다.
            </div>
          ) : isChatLoading && chatMessagesData.length === 0 ? (
            <div className="py-20 text-center font-bold text-rose-500 uppercase tracking-widest text-sm opacity-50 animate-pulse">
              메시지를 불러오는 중...
            </div>
          ) : (
            chatMessagesData.map((msg, idx) => {
              const isAi = msg.speakerType === 'AVATAR' || msg.speakerType === 'AI';
              return isAi ? (
                <div key={msg.id || idx} className="flex gap-6 items-start self-start max-w-[85%]">
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <div className="w-24 h-24 rounded-2xl bg-[#eee5df] shadow-lg border border-white/50 overflow-hidden">
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${msg.assistantId}`}
                        alt="AI"
                      />
                    </div>
                    <span className="text-sm font-black text-gray-500 mt-1">AI</span>
                  </div>
                  <div className="pt-2 flex flex-col gap-2">
                    <h2 className="text-3xl font-black text-gray-900 leading-snug break-keep bg-black/5 p-6 rounded-[2.5rem] rounded-tl-sm border border-black/5 shadow-sm">
                      {msg.text}
                    </h2>
                    <span className="text-xs font-bold text-gray-400 pl-2">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  key={msg.id || idx}
                  className="flex gap-6 items-start self-end max-w-[85%] flex-row-reverse"
                >
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <div className="w-24 h-24 rounded-2xl bg-black shadow-2xl relative overflow-hidden">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.userId}`}
                        alt="User"
                      />
                    </div>
                    <span className="text-sm font-black text-gray-800 mt-1">You</span>
                  </div>
                  <div className="pt-2 flex flex-col gap-2 text-right">
                    <h2 className="text-3xl font-black text-white bg-rose-500 p-6 rounded-[2.5rem] rounded-tr-sm leading-snug break-keep shadow-lg">
                      {msg.text}
                    </h2>
                    <span className="text-xs font-bold text-gray-400 pr-2">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ChatHistoryView;
