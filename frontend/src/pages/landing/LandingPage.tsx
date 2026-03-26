import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '../../routes/paths';

/**
 * LandingPage.tsx
 *
 * 모션을 더 뚜렷하게(Wider Pulse) 만들어 사용자가 일렁임을 확실히 인지할 수 있도록 
 * 수정한 버전입니다.
 */
const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // 배경 부유 애니메이션 (배경 전체가 아주 천천히 움직임)
  const floatingVariant: Variants = {
    animate: {
      y: [-30, 30],
      transition: {
        duration: 90,
        repeat: Infinity,
        repeatType: 'mirror' as const,
        ease: 'easeInOut' as const,
      },
    },
  };

  // 끊임없이 일렁이는(Pulse) 파형 애니메이션 - 범위를 넓혀 가시성 확보
  const rippleVariants = (delay: number): Variants => ({
    initial: { scale: 0.9, opacity: 0 },
    animate: {
      // 멈춤 없이 계속해서 수축과 이완을 반복하는 일렁임 (범위를 1.1까지 확대)
      scale: [1, 1.08, 0.94, 1],
      opacity: [0.7, 1, 0.6, 0.9],
      transition: {
        duration: 8,
        delay: delay,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
  });

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center font-sans tracking-tight bg-[#543A5F]">
      {/* 1. 제공된 색상 기반의 정교한 배경 그라데이션 (비율 조정하여 하단 보라색 노출) */}
      <motion.div
        variants={floatingVariant}
        animate="animate"
        className="absolute inset-x-0 -top-[40px] -bottom-[40px] z-0"
        style={{
          background: `linear-gradient(to bottom, 
            #E594A7 0%, 
            #E08898 30%, 
            #DF7987 50%, 
            #A96178 65%, 
            #8B5472 80%, 
            #684464 90%, 
            #543A5F 100%)`,
          willChange: 'transform',
        }}
      />

      {/* 2. 끊임없이 일렁이는 동심원 파형 (범위 확대 버전) */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        {[...Array(9)].map((_, i) => {
          const size = (i + 1) * 320; 
          const stagger = i * 0.4;
          
          return (
            <motion.div
              key={i}
              variants={rippleVariants(stagger)}
              initial="initial"
              animate="animate"
              style={{ 
                willChange: 'transform, opacity',
                zIndex: 10 - i,
              }}
              className="absolute rounded-full"
            >
              <div 
                className="rounded-full flex items-center justify-center"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  // 가장 안쪽 원(i=0)일 때만 특별한 그라데이션 적용 + 빛 번짐
                  background: i === 0 
                    ? 'radial-gradient(circle, #D96477 0%, rgba(217, 100, 119, 0.3) 60%, transparent 100%)'
                    : `rgba(255, 255, 255, ${0.03 + (i * 0.007)})`,
                  border: '1.5px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: i === 0 
                    ? '0 0 100px rgba(217, 100, 119, 0.4)' 
                    : 'none',
                }}
              />
            </motion.div>
          );
        })}
        {/* 중앙의 몽환적 광원 (더 밝게) */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-[500px] h-[500px] rounded-full bg-white/10 blur-[130px] z-5"
        />
      </div>

      {/* 3. 중앙 텍스트 및 버튼 */}
      <div className="relative z-30 flex flex-col items-center text-center px-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          <span className="text-white/60 text-lg font-bold tracking-[0.4em] lowercase mb-6 block drop-shadow-sm select-none">
            ssarvis come true
          </span>
          <h1 className="text-6xl md:text-8xl font-black text-white mb-16 drop-shadow-2xl leading-[1.1] select-none">
            나를 닮은
            <br />
            나만의 ai
          </h1>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <button
              onClick={() => navigate(PATHS.GUEST_EXPERIENCE)}
              className="px-12 py-5 rounded-full border border-white/20 bg-white/5 backdrop-blur-3xl text-white font-bold text-lg hover:bg-white/10 transition-all hover:scale-105 shadow-xl min-w-[300px]"
            >
              유명인 싸비스 체험해보기
            </button>
            <button
              onClick={() => navigate(PATHS.LOGIN)}
              className="px-12 py-5 rounded-full bg-white text-[#6b476e] font-black text-lg hover:bg-white/95 transition-all hover:scale-105 shadow-[0_30px_60px_rgba(0,0,0,0.3)] min-w-[280px]"
            >
              내 싸비스 만나러가기
            </button>
          </div>
        </motion.div>
      </div>

      {/* 질감을 더해주는 아주 옅은 입자 노이즈 */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay z-40" />
    </div>
  );
};

export default LandingPage;
