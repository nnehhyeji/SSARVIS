import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ExternalLink, ArrowRight } from 'lucide-react';
import { PATHS } from '../../routes/paths';

/**
 * GuestExperiencePage.tsx
 * 
 * 유명인 AI 모델을 체험해볼 수 있는 선택 페이지입니다.
 * 5명의 게스트 모델과 본인만의 AI를 만들 수 있는 옵션을 제공합니다.
 */
interface GuestModel {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  isCustom?: boolean;
}

const GUEST_MODELS: GuestModel[] = [
  {
    id: '유비스',
    name: '유비스',
    description: 'Korean movie star',
    imageUrl: '/assets/model1.png',
  },
  {
    id: '카비스',
    name: '카비스',
    description: 'Kpop idol',
    imageUrl: '/assets/model2.png',
  },
  {
    id: '태비스',
    name: '태비스',
    description: 'Korean actor',
    imageUrl: '/assets/model3.png',
  },
  {
    id: '짱비스',
    name: '짱비스',
    description: 'Main Character',
    imageUrl: '/assets/model4.png',
  },
  {
    id: '주비스',
    name: '주비스',
    description: 'Korean Reporter',
    imageUrl: '/assets/model5.png',
  },
  {
    id: 'ssarvis',
    name: '싸비스',
    description: "It's your turn",
    imageUrl: '/assets/model6.png',
    isCustom: true,
  },
];

const GuestExperiencePage: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('링크가 클립보드에 복사되었습니다.');
    } catch (err) {
      console.error('링크 복사 실패:', err);
    }
  };

  const handleModelClick = (model: GuestModel) => {
    if (model.isCustom) {
      navigate(PATHS.LOGIN);
    } else {
      alert(`${model.name}와(과)의 대화 기능은 현재 준비 중입니다!`);
    }
  };

  return (
    <div className="relative w-full h-screen bg-white flex items-center justify-center font-sans overflow-hidden">
      {/* 상단 헤더 버튼: 이전으로 */}
      <div className="fixed top-10 left-10 z-[100]">
        <motion.button
          onClick={() => navigate(PATHS.HOME)}
          initial={{ width: 48, backgroundColor: "#f5f5f5" }}
          whileHover={{ 
            width: 160, 
            backgroundColor: "#fce8e9", 
          }}
          transition={{ duration: 0.2 }}
          className="relative h-12 flex items-center justify-center rounded-full shadow-sm overflow-hidden whitespace-nowrap group"
        >
          <div className="absolute left-0 w-12 h-12 flex items-center justify-center">
            <ChevronLeft className="w-6 h-6 text-gray-500 group-hover:text-[#d64146] transition-colors" />
          </div>
          <span className="font-black text-lg text-[#d64146] ml-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            이전으로
          </span>
        </motion.button>
      </div>

      {/* 상단 헤더 버튼: 공유하기 */}
      <div className="fixed top-10 right-10 z-[100]">
        <motion.button
          onClick={handleShare}
          initial={{ width: 48, backgroundColor: "#f5f5f5" }}
          whileHover={{ 
            width: 160, 
            backgroundColor: "#fce8e9", 
          }}
          transition={{ duration: 0.2 }}
          className="relative h-12 flex items-center justify-center rounded-full shadow-sm overflow-hidden whitespace-nowrap group"
        >
          <div className="absolute right-0 w-12 h-12 flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-[#d64146] transition-colors" />
          </div>
          <span className="font-black text-lg text-[#d64146] mr-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            공유하기
          </span>
        </motion.button>
      </div>

      {/* 중앙 콘텐츠: 모델 그리드 */}
      <div className="max-w-[1100px] w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-20 px-10">
        {GUEST_MODELS.map((model) => (
          <motion.div
            key={model.id}
            onMouseEnter={() => setHoveredId(model.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => handleModelClick(model)}
            className="group flex items-center gap-8 cursor-pointer"
          >
            {/* 사진 컨테이너 (세로가 더 긴 4:3 비율 느낌 재현: 140x180) */}
            <div className="relative w-[140px] h-[180px] flex-shrink-0">
              <div className="w-full h-full rounded-[45px] overflow-hidden bg-gray-50 border border-gray-100 shadow-sm transition-transform duration-500 group-hover:scale-105 flex items-center justify-center">
                <motion.img
                  src={model.imageUrl}
                  alt={model.name}
                  className="w-full h-full object-cover"
                  initial={false}
                  animate={{
                    filter: hoveredId === model.id ? 'blur(0px)' : 'blur(6px)',
                    scale: hoveredId === model.id ? 1.05 : 1,
                  }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
                    (e.target as HTMLImageElement).className = "w-full h-full bg-gray-200 opacity-50";
                  }}
                />
              </div>
            </div>

            {/* 텍스트 정보 (이미지 하단 정렬) */}
            <div className="flex flex-col justify-end h-[180px] pb-2">
              <div className="flex items-center gap-1">
                <h3 className="text-[28px] font-black text-gray-900 tracking-tighter leading-none">
                  {model.name}
                </h3>
                {model.isCustom && (
                  <ArrowRight className="w-6 h-6 text-rose-500 ml-1" />
                )}
              </div>
              <p className={`text-[15px] tracking-tight mt-2 ${model.isCustom ? 'text-rose-500 font-medium' : 'text-gray-400 font-normal'}`}>
                {model.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default GuestExperiencePage;
