import React from 'react';

// ─── FaceDesign ───
// 역할: 3D 구체 표면(Html)에 렌더링되는 캐릭터 얼굴 디자인 컴포넌트
// - type(0~5) props에 따라 6가지 표정을 렌더링합니다.
// - mouthOpenRadius props에 따라 입 크기가 변해 말하는 느낌을 표현합니다.
// - mode props에 따라 학습 모드(안경), 상담 모드(커피잔) 악세서리를 표시합니다.
// - Character3D에서 <Html>로 감싸 구체 표면 위에 배치됩니다.

interface FaceDesignProps {
  type: number;
  mouthOpenRadius: number;
  mode: string;
}

export default function FaceDesign({ type, mouthOpenRadius, mode }: FaceDesignProps) {
  const effectiveType = mode === 'persona' ? 5 : type;

  // 공통 눈 렌더링 함수 (크기 대폭 확대)
  const renderEyes = (eyeStyle: React.CSSProperties) => (
    <>
      <div
        className="absolute top-[40%] left-[25%] bg-gray-800 rounded-full"
        style={{ ...eyeStyle, transform: 'translateZ(30px)' }}
      />
      <div
        className="absolute top-[40%] right-[25%] bg-gray-800 rounded-full"
        style={{ ...eyeStyle, transform: 'translateZ(30px)' }}
      />
    </>
  );

  // 공통 눈썹 렌더링 함수
  const renderEyebrows = () => (
    <>
      {/* 왼쪽 눈썹 */}
      <div
        className="absolute top-[25%] left-[25%] w-10 h-3 bg-gray-700 rounded-full opacity-80"
        style={{ transform: 'translateZ(30px) rotate(-10deg)' }}
      />
      {/* 오른쪽 눈썹 */}
      <div
        className="absolute top-[25%] right-[25%] w-10 h-3 bg-gray-700 rounded-full opacity-80"
        style={{ transform: 'translateZ(30px) rotate(10deg)' }}
      />
    </>
  );

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center [transform-style:preserve-3d]">
      {renderEyebrows()}

      {/* 학습모드 전용 3D 사각 뿔테 안경 (HTML CSS 3D 완벽 적용)
          얼굴 요소들과 동일한 DOM 레이어에서 렌더링되어 투명도 및 깊이(z-index) 완벽 연동 */}
      {mode === 'study' && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            // Z축 돌출을 통해 코보다 넉넉하게 앞에 띄워서 캐릭터 뺨이나 눈썹과 충돌 방지
            transform: 'translate(-50%, -50%) translateZ(65px)',
            width: '420px', // 안경테 잘림 현상 방지를 위해 좌우 너비 대폭 확보
            transformStyle: 'preserve-3d',
            zIndex: 50,
          }}
        >
          {/* 안경 전면부 SVG (사각 뿔테) - 여백을 포함하여 중앙 정렬되도록 오프셋(x +40 추가) */}
          <svg
            viewBox="0 0 420 140"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              width: '100%',
              height: 'auto',
              filter: 'drop-shadow(0 15px 15px rgba(180,0,0,0.5))',
              position: 'relative',
              zIndex: 10,
              display: 'block',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* 코 브리지 */}
            <path
              d="M 192 50 Q 210 42 228 50"
              fill="none"
              stroke="#D30000"
              strokeWidth="12"
              strokeLinecap="square"
            />

            {/* 왼쪽 사각 렌즈 */}
            <rect
              x="65"
              y="15"
              width="127"
              height="90"
              rx="12"
              fill="rgba(255,255,255,0.15)"
              stroke="#D30000"
              strokeWidth="16"
            />
            {/* 왼쪽 렌즈 빛 반사 (픽셀아트 느낌) */}
            <rect x="80" y="30" width="18" height="18" fill="white" opacity="0.8" />
            <rect x="104" y="30" width="8" height="18" fill="white" opacity="0.8" />

            {/* 오른쪽 사각 렌즈 */}
            <rect
              x="228"
              y="15"
              width="127"
              height="90"
              rx="12"
              fill="rgba(255,255,255,0.15)"
              stroke="#D30000"
              strokeWidth="16"
            />
            {/* 오른쪽 렌즈 빛 반사 */}
            <rect x="243" y="30" width="18" height="18" fill="white" opacity="0.8" />
            <rect x="267" y="30" width="8" height="18" fill="white" opacity="0.8" />
          </svg>
        </div>
      )}

      {/* 상담모드 전용: 양손으로 소중히 안고 있는 커피잔 (우측 하단) */}
      {mode === 'counseling' && (
        <div
          className="absolute pointer-events-none flex items-center justify-center"
          style={{
            // 좀 더 오른쪽으로 치우치게 배치하고 사이즈를 줄임
            top: '75%',
            left: '95%', // 80% -> 95%로 더 오른쪽으로 밀어내기
            transform: 'translate(-50%, -50%) translateZ(120px) rotateY(-15deg)',
            width: '180px', // 220px -> 180px로 사이즈 축소
            height: '180px',
            transformStyle: 'preserve-3d',
            zIndex: 60,
          }}
        >
          {/* 전체 요소(손+컵+김)가 아주 천천히 상하로 둥둥 떠다니도록 애니메이션 */}
          <div
            className="w-full h-full relative"
            style={{
              transformStyle: 'preserve-3d',
              animation: 'floatCoffee 3s ease-in-out infinite alternate',
            }}
          >
            {/* 1) 모락모락 김 (Coffee Steam) - 빵빵한 구름(☁️) 이모지를 겹쳐 풍성한 증기 효과 */}
            <div
              className="absolute top-[-80px] left-[50%] -translate-x-1/2 w-full h-full"
              style={{ transform: 'translateZ(15px)' }}
            >
              <style>
                {`
                  @keyframes steamRise {
                    0% { transform: translateY(30px) scale(0.5) rotate(-5deg); opacity: 0; }
                    40% { opacity: 0.8; }
                    100% { transform: translateY(-70px) scale(1.5) rotate(15deg); opacity: 0; }
                  }
                  @keyframes floatCoffee {
                    0% { transform: translateY(0px) rotateZ(0deg); }
                    100% { transform: translateY(-12px) rotateZ(3deg); }
                  }
                `}
              </style>
              {/* 핑크빛 하트 김 */}
              <div
                className="absolute text-pink-200 drop-shadow-md"
                style={{
                  top: '60px',
                  left: '80px',
                  fontSize: '60px',
                  opacity: 0,
                  animation: 'steamRise 3s infinite ease-in-out',
                }}
              >
                💕
              </div>
              <div
                className="absolute text-pink-100 drop-shadow-md"
                style={{
                  top: '70px',
                  left: '110px',
                  fontSize: '50px',
                  opacity: 0,
                  animation: 'steamRise 3.5s infinite delay-[1.2s] ease-in-out',
                }}
              >
                🤍
              </div>
              <div
                className="absolute text-pink-200 drop-shadow-md"
                style={{
                  top: '50px',
                  left: '140px',
                  fontSize: '70px',
                  opacity: 0,
                  animation: 'steamRise 4s infinite delay-[0.6s] ease-in-out',
                }}
              >
                🩷
              </div>
              <div
                className="absolute text-pink-100 drop-shadow-md"
                style={{
                  top: '40px',
                  left: '100px',
                  fontSize: '65px',
                  opacity: 0,
                  animation: 'steamRise 3.2s infinite delay-[2s] ease-in-out',
                }}
              >
                💖
              </div>
            </div>

            {/* 몸통 쪽 (왼) 손 삭제 요청에 따라 해당 div 영역 제거 */}

            {/* 3) 커피 머그컵 (시안과 유사한 그라데이션, 받침대 포함된 고급 3D 형태) */}
            <svg
              viewBox="0 0 240 200"
              className="absolute inset-0 w-[150%] h-[150%] left-[-25%] top-[-25%]"
              style={{
                transform: 'translateZ(10px) rotateX(15deg) rotateZ(-5deg)',
                filter: 'drop-shadow(0 20px 20px rgba(0,0,0,0.25))',
              }}
            >
              <defs>
                <radialGradient id="cupBodyGradient" cx="50%" cy="30%" r="70%" fx="30%" fy="30%">
                  <stop offset="0%" stopColor="#FFEEA3" />
                  <stop offset="60%" stopColor="#F5D374" />
                  <stop offset="100%" stopColor="#DAA520" />
                </radialGradient>
                <radialGradient id="cupInside" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#F4F0EA" />
                  <stop offset="100%" stopColor="#D5CBBB" />
                </radialGradient>
                <radialGradient id="saucerGradient" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                  <stop offset="0%" stopColor="#FFEEA3" />
                  <stop offset="80%" stopColor="#E3BB58" />
                  <stop offset="100%" stopColor="#C99324" />
                </radialGradient>
              </defs>

              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                {/* 1. 밑받침 접시 (Saucer) */}
                <ellipse cx="120" cy="160" rx="90" ry="25" fill="url(#saucerGradient)" />
                <ellipse cx="120" cy="160" rx="90" ry="25" stroke="#FDEBB0" strokeWidth="3" />
                {/* 1-1. 접시 안쪽 파인 부분 */}
                <ellipse cx="120" cy="162" rx="50" ry="14" fill="#DAA520" opacity="0.4" />
                <ellipse cx="120" cy="163" rx="40" ry="10" fill="#C99324" opacity="0.6" />
                {/* 2. 컵 손잡이 */}
                <path
                  d="M 160 90 Q 220 80 210 120 Q 200 150 150 145"
                  stroke="url(#cupBodyGradient)"
                  strokeWidth="12"
                />
                <path
                  d="M 160 90 Q 220 80 210 120 Q 200 150 150 145"
                  stroke="#F5C6CB"
                  strokeWidth="4"
                  opacity="0.4"
                />
                {/* 3. 머그컵 바깥쪽 둥근 몸통 */}
                <path
                  d="M 60 70 Q 60 150 85 155 L 155 155 Q 180 150 180 70 Z"
                  fill="url(#cupBodyGradient)"
                />
                {/* 3-1. 입체 반사광 */}
                <path
                  d="M 70 80 Q 70 135 88 140"
                  stroke="white"
                  strokeWidth="4"
                  opacity="0.4"
                  strokeLinecap="round"
                />
                {/* 4. 컵 주둥이 안쪽 공간 */}
                <ellipse cx="120" cy="70" rx="60" ry="18" fill="url(#cupInside)" />
                {/* 4-1. 커피 수면 */}
                <ellipse cx="120" cy="73" rx="48" ry="12" fill="#3B261D" />
                <ellipse
                  cx="100"
                  cy="72"
                  rx="10"
                  ry="3"
                  fill="white"
                  opacity="0.2"
                  transform="rotate(-15 100 72)"
                />
                {/* 5. 컵 주둥이 가장자리 */}
                <ellipse cx="120" cy="70" rx="60" ry="18" stroke="#FFF7D8" strokeWidth="6" />
              </g>
            </svg>

            {/* 4) 컵 조심스럽게 받치고 있는 둥근 손 */}
            <div
              className="absolute bg-[#FDF9F1] border-[6px] border-gray-800 rounded-full"
              style={{
                width: '65px',
                height: '40px',
                bottom: '-20px',
                left: '50%',
                transform: 'translateX(-50%) translateZ(40px) rotateX(-10deg)',
                boxShadow: 'inset -4px -8px 10px rgba(0,0,0,0.15)',
                zIndex: 20,
              }}
            />
          </div>
        </div>
      )}

      {/* 페르소나 모드: 화사한 반짝임 효과 (Sparkles & Aura) */}
      {mode === 'persona' && (
        <div
          className="absolute inset-0 pointer-events-none [transform-style:preserve-3d]"
          style={{ transform: 'translateZ(100px)' }}
        >
          <style>
            {`
              @keyframes twinkle {
                0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0.3; }
                50% { transform: scale(1.2) rotate(45deg); opacity: 1; }
              }
              @keyframes orbit {
                from { transform: rotateY(0deg) translateX(180px) rotateY(0deg); }
                to { transform: rotateY(360deg) translateX(180px) rotateY(-360deg); }
              }
            `}
          </style>
          {/* 반짝이는 별들 */}
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute text-yellow-300 drop-shadow-[0_0_10px_rgba(255,255,0,0.8)]"
              style={{
                left: '50%',
                top: '50%',
                fontSize: `${20 + (i % 3) * 10}px`,
                animation: `twinkle ${1.5 + i * 0.2}s infinite ease-in-out, orbit ${3 + i * 0.5}s infinite linear`,
                animationDelay: `${i * 0.4}s`,
                marginTop: '-25px',
                marginLeft: '-25px',
              }}
            >
              ✨
            </div>
          ))}
          {/* 머리 위 머리띠 형태의 오라 */}
          <div
            className="absolute top-[10%] left-1/2 -translate-x-1/2 w-48 h-4 bg-gradient-to-r from-transparent via-yellow-200 to-transparent blur-lg opacity-60"
            style={{ transform: 'translateZ(-50px)' }}
          />
        </div>
      )}

      {/* 페르소나 모드일 때는 항상 웃는 얼굴(타입 5)이 베이스가 되도록 강제하거나,
          각 타입별로 페르소나 효과를 추가할 수 있습니다. 여기서는 모드에 따라 얼굴 타입 구성을 살짝 변경합니다. */}
      {/* 페르소나 모드일 때는 항상 웃는 얼굴(타입 5)이 베임이 되도록 강제합니다. */}
      {effectiveType === 0 && (
        // 디자인 1: 세로로 긴 타원 눈, 알파벳 O 모양 입
        <>
          {renderEyes({ width: '24px', height: '48px' })}
          <div
            className="absolute top-[60%] left-1/2 -translate-x-1/2 border-[8px] border-gray-800 rounded-full transition-all duration-150"
            style={{
              width: `${mouthOpenRadius * 4 + 30}px`,
              height: `${mouthOpenRadius * 6 + 40}px`,
              backgroundColor: mouthOpenRadius > 2 ? '#ffb3ba' : 'transparent',
              transform: 'translateX(-50%) translateZ(35px)',
            }}
          />
        </>
      )}

      {effectiveType === 1 && (
        // 디자인 2: 엄청 큰 왕눈이 동그란 눈
        <>
          {renderEyes({ width: '40px', height: '40px' })}
          <div
            className="absolute top-[65%] left-1/2 -translate-x-1/2 bg-gray-800 rounded-full transition-all duration-150"
            style={{
              width: `${mouthOpenRadius > 2 ? 60 : 30}px`,
              height: `${mouthOpenRadius > 2 ? 40 : 10}px`,
              transform: 'translateX(-50%) translateZ(35px)',
            }}
          />
        </>
      )}

      {effectiveType === 2 && (
        // 디자인 3: 가로 라인 눈 (감은 눈 혹은 웃는 눈)
        <>
          <div
            className="absolute top-[40%] left-[20%] w-16 h-4 bg-gray-800 rounded-full"
            style={{ transform: 'translateZ(30px)' }}
          />
          <div
            className="absolute top-[40%] right-[20%] w-16 h-4 bg-gray-800 rounded-full"
            style={{ transform: 'translateZ(30px)' }}
          />
          <div
            className="absolute top-[60%] left-1/2 -translate-x-1/2 bg-gray-800 transition-all duration-150 rounded-b-full"
            style={{
              width: '80px',
              height: `${mouthOpenRadius * 4 + 10}px`,
              transform: 'translateX(-50%) translateZ(35px)',
            }}
          />
        </>
      )}

      {effectiveType === 3 && (
        // 디자인 4: 사각형 눈
        <>
          {renderEyes({ width: '36px', height: '36px', borderRadius: '8px' })}
          <div
            className="absolute top-[65%] left-1/2 -translate-x-1/2 bg-gray-800 transition-all duration-150"
            style={{
              width: '48px',
              height: `${mouthOpenRadius > 2 ? 32 : 8}px`,
              borderRadius: '8px',
              transform: 'translateX(-50%) translateZ(35px)',
            }}
          />
        </>
      )}

      {effectiveType === 4 && (
        // 디자인 5: V 모양 입꼬리 상승
        <>
          {renderEyes({ width: '32px', height: '40px' })}
          <svg
            className="absolute top-[60%] left-1/2 -translate-x-1/2 w-24 h-20 overflow-visible"
            style={{ transform: 'translateX(-50%) translateZ(35px)' }}
          >
            <path
              d={mouthOpenRadius > 2 ? 'M 10 20 Q 48 60 86 20' : 'M 10 20 Q 48 40 86 20'}
              fill="transparent"
              stroke="#1f2937"
              strokeWidth="8"
              strokeLinecap="round"
              className="transition-all duration-150"
            />
          </svg>
        </>
      )}

      {effectiveType === 5 && (
        // 디자인 6: 깜찍한 반달 눈
        <>
          <svg
            className="absolute top-[35%] left-[20%] w-16 h-16"
            style={{ transform: 'translateZ(30px)' }}
          >
            <path
              d="M 10 40 Q 30 10 50 40"
              fill="transparent"
              stroke="#1f2937"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
          <svg
            className="absolute top-[35%] right-[20%] w-16 h-16"
            style={{ transform: 'translateZ(30px)' }}
          >
            <path
              d="M 10 40 Q 30 10 50 40"
              fill="transparent"
              stroke="#1f2937"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
          <div
            className="absolute top-[60%] left-1/2 -translate-x-1/2 bg-pink-400 rounded-full transition-all duration-150 opacity-80"
            style={{
              width: `${mouthOpenRadius * 4 + 30}px`,
              height: `${mouthOpenRadius * 4 + 30}px`,
              transform: 'translateX(-50%) translateZ(35px)',
            }}
          />
        </>
      )}
    </div>
  );
}
