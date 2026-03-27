import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { PATHS } from '../../routes/paths';

interface GuestModel {
  id: string;
  name: string;
  shortName: string;
  description: string;
  imageUrl: string;
}

const GUEST_MODELS: GuestModel[] = [
  {
    id: '유비스',
    name: '유해진',
    shortName: '해진',
    description: 'Korean movie star',
    imageUrl: '/assets/model1.png',
  },
  {
    id: '카비스',
    name: '카리나',
    shortName: '카리나',
    description: 'Kpop idol',
    imageUrl: '/assets/model2.png',
  },
  {
    id: '태비스',
    name: '김태리',
    shortName: '태리',
    description: 'Korean actor',
    imageUrl: '/assets/model3.png',
  },
  {
    id: '짱비스',
    name: '짱구',
    shortName: '짱구',
    description: 'Main Character',
    imageUrl: '/assets/model4.png',
  },
  {
    id: '주비스',
    name: '주현영',
    shortName: '현영',
    description: 'Korean Reporter',
    imageUrl: '/assets/model5.png',
  },
];

const GuestCompletePage: React.FC = () => {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();

  // URL 인코딩된 한글 파라미터 대응
  const decodedModelId = modelId ? decodeURIComponent(modelId) : '';
  const currentModelIndex = GUEST_MODELS.findIndex((m) => m.id === decodedModelId);
  const currentModel = currentModelIndex !== -1 ? GUEST_MODELS[currentModelIndex] : GUEST_MODELS[0];

  const nextModel = GUEST_MODELS[(currentModelIndex + 1) % GUEST_MODELS.length];

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('링크가 클립보드에 복사되었습니다.');
    } catch (err) {
      console.error('링크 복사 실패:', err);
    }
  };

  return (
    <div className="relative w-full h-screen bg-white flex flex-col items-center justify-center font-sans overflow-hidden px-6">
      <div className="fixed top-10 left-10 z-[100]">
        <button
          onClick={() => navigate(PATHS.GUEST_EXPERIENCE)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="fixed top-10 right-10 z-[100]">
        <button
          onClick={handleShare}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <ExternalLink className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center w-full max-w-xl"
      >
        {/* 모델 컨테이너 (사진 기준 설정, 텍스트 우하단 정렬) */}
        <div className="flex items-end gap-5 mb-8">
          <div
            className="w-32 h-36 rounded-3xl overflow-hidden bg-gray-50 flex-shrink-0 shadow-sm border border-gray-100"
            style={{ borderRadius: '40px' }}
          >
            <img
              src={currentModel.imageUrl}
              alt={currentModel.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
              }}
            />
          </div>
          <div className="text-left pb-2 flex flex-col justify-end">
            <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-1">
              {currentModel.name}
            </h3>
            <p className="text-gray-400 font-medium text-[15px]">{currentModel.description}</p>
          </div>
        </div>

        <h1 className="text-2xl font-black text-gray-900 leading-snug mb-8 break-keep">
          {currentModel.shortName}님의 싸비스와 즐거운 시간 보내셨나요 ?<br />
          여러분의 싸비스를 만들어보세요.
        </h1>

        <button
          onClick={() => navigate(PATHS.LOGIN)}
          className="px-6 py-2.5 bg-rose-50 text-rose-500 rounded-full font-bold text-xs tracking-tight hover:bg-rose-100 active:scale-95 transition-all"
        >
          싸비스 생성하기
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={() => navigate(PATHS.GUEST_EXPERIENCE)}
        className="fixed bottom-12 flex items-center gap-4 cursor-pointer group"
      >
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100 p-1 flex-shrink-0">
          <div className="w-full h-full rounded-xl overflow-hidden bg-gray-50">
            <img
              src={nextModel.imageUrl}
              alt={nextModel.name}
              className="w-full h-full object-cover blur-[2px] opacity-80"
            />
          </div>
        </div>
        <div className="text-left flex flex-col justify-center gap-0.5">
          <div className="flex items-center">
            <span className="text-gray-500 font-black text-sm">Next</span>
          </div>
          <p className="text-gray-900 text-xs font-black tracking-tight">
            사용자님을 기다리는 또 다른 싸비스가 있어요 !
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default GuestCompletePage;
