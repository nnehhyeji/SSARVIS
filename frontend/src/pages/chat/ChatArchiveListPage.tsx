import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

const ChatArchiveListPage: React.FC = () => {
  return (
    <div className="w-full h-full relative bg-white flex flex-col items-center justify-center gap-6 overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute top-10 left-10"><MessageCircle className="w-64 h-64" /></div>
        <div className="absolute bottom-20 right-20"><MessageCircle className="w-96 h-96" /></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center gap-6 z-10"
      >
        <div className="w-32 h-32 rounded-[2.5rem] bg-gray-50 border-2 border-dashed border-gray-100 flex items-center justify-center">
          <MessageCircle className="w-12 h-12 text-gray-200" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-black text-gray-400 tracking-tight uppercase">Ready to Chat</h3>
          <p className="text-sm font-bold text-gray-300 mt-2">왼쪽 대화 보관함에서 대화 내역을 선택해주세요.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatArchiveListPage;
