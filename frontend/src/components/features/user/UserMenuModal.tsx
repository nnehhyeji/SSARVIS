import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../../routes/paths';

interface UserMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name: string;
    email: string;
    profileImage?: string;
  };
}

export default function UserMenuModal({ isOpen, onClose, user }: UserMenuModalProps) {
  const navigate = useNavigate();

  const handleMenuClick = (tab: string) => {
    navigate(PATHS.SETTINGS_PARAM.replace(':tab', tab));
    onClose();
  };

  const handleLogout = () => {
    // 로그아웃 로직 (일단 로그인 페이지로)
    onClose();
    navigate(PATHS.LOGIN);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            className="relative w-[320px] bg-[#E2E2E2] rounded-[32px] shadow-2xl overflow-hidden border border-white/20 flex flex-col p-6 text-gray-800"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>

            {/* Profile Section */}
            <div className="flex items-center gap-4 mt-6 mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-green-100 via-white to-pink-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="relative w-8 h-8">
                    {/* Simplified Character Face from the image */}
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="flex gap-2">
                        <div className="w-1.5 h-2.5 bg-gray-800 rounded-full" />
                        <div className="w-1.5 h-2.5 bg-gray-800 rounded-full" />
                      </div>
                      <div className="w-3.5 h-2 border-b-2 border-gray-800 rounded-full mt-1" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-1">
                  {user.name}
                </h3>
                <p className="text-sm font-medium text-gray-500 tracking-tight">{user.email}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-gray-300/50 mb-4" />

            {/* Menu Items */}
            <div className="flex flex-col gap-1 items-center mb-12">
              <button
                onClick={() => handleMenuClick('account')}
                className="w-full py-4 rounded-2xl hover:bg-white/40 transition-all font-bold text-xl text-gray-800"
              >
                개인정보 변경
              </button>
              <button
                onClick={() => handleMenuClick('ai')}
                className="w-full py-4 rounded-2xl hover:bg-white/40 transition-all font-bold text-xl text-gray-800"
              >
                음성 및 성격 설정
              </button>
            </div>

            {/* Logout Button */}
            <div className="mt-auto flex justify-center pb-2">
              <button
                onClick={handleLogout}
                className="text-[#FF6B6B] font-extrabold text-2xl hover:scale-105 transition-transform"
              >
                로그아웃
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
