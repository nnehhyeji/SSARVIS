/**
 * ChatArchivePage.tsx
 *
 * 독립적인 페이지에서 특정 대화 세션의 내역을 보여주는 페이지입니다.
 * ChatArchiveView 컴포넌트를 재사용하여 UI 일관성을 유지합니다.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import ChatArchiveView from '../../components/common/ChatArchiveView';

export default function ChatArchivePage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  return (
    <div className="w-full h-screen bg-white flex flex-col overflow-hidden relative">
      {/* Top Header/Action Bar */}
      <div className="h-20 shrink-0 px-8 flex items-center justify-between border-b border-gray-50 z-20">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors"
        >
          <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-gray-50 transition">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm tracking-tight">뒤로 가기</span>
        </button>

        {/* Profile (Consistent with Sidebar design) */}
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=MainUser"
            alt="Main User"
          />
        </div>
      </div>

      {/* Main Content: ChatArchiveView Reused */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        <ChatArchiveView selectedChatId={sessionId || null} />
      </div>
    </div>
  );
}
