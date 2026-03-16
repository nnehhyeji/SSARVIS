import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Mic, Lock, Users, Bell, User, Maximize, Home, BookOpen, Heart, Smile, X, UserPlus } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Html, Float, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground';

// 별도의 고성능 컴포넌트로 분리된 파형 링 (React 리렌더링과 독립적으로 부드럽게 애니메이션 유지)
const WaveformRing = ({ isActive }: { isActive: boolean }) => {
  const linesRef = useRef<(SVGLineElement | null)[]>([]);

  useEffect(() => {
    let aniInterval: ReturnType<typeof setInterval>;
    if (isActive) {
      aniInterval = setInterval(() => {
        linesRef.current.forEach((line) => {
          if (!line) return;
          const length = 20 + Math.random() * 25;
          line.setAttribute('y1', String(45 - length));
        });
      }, 80); // 80ms 간격으로 빠르게 파형 통통 튀도록
    } else {
      // 비활성화 시 기본값으로 복귀
      linesRef.current.forEach((line) => {
        if (!line) return;
        line.setAttribute('y1', '25'); // length = 20
      });
    }
    return () => clearInterval(aniInterval);
  }, [isActive]);

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500 z-[-1] ${isActive ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* 캐릭터 구체보다 큰 450px 사이즈로 테두리에 표시되도록 함 */}
      <svg viewBox="0 0 450 450" className="w-[450px] h-[450px] absolute">
        <g>
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = (i * 360) / 60;
            return (
              <line
                key={i}
                ref={(el) => {
                  linesRef.current[i] = el;
                }}
                x1="225"
                y1="25"
                x2="225"
                y2="45"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="3"
                strokeLinecap="round"
                transform={`rotate(${angle} 225 225)`}
                className="transition-all duration-75 uppercase"
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};

// ─── SpeechBubble: 타이핑 state를 완전히 격리한 독립 컴포넌트 ───
const SpeechBubble = memo(
  ({
    triggerText,
    onStart,
    onEnd,
  }: {
    triggerText: string;
    onStart: () => void;
    onEnd: () => void;
  }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
      if (!triggerText) return;
      let i = 0;
      let current = '';
      setDisplayedText('');
      onStart(); // 타이핑 시작 → 입 움직이기 시작
      const interval = setInterval(() => {
        if (i < triggerText.length) {
          current += triggerText.charAt(i);
          setDisplayedText(current);
          i++;
        } else {
          clearInterval(interval);
          onEnd(); // 타이핑 완료 → 입 멈추기
        }
      }, 100);
      return () => clearInterval(interval);
    }, [triggerText, onStart, onEnd]);

    if (!displayedText) return null;

    return (
      <div className="mt-8 z-20">
        {/* drop-shadow 필터: 몸통+꼬리 전체 실루엣에 하나의 그림자 적용 */}
        <div className="relative drop-shadow-lg transition-opacity duration-300 transform opacity-100 translate-y-0">
          {/* 몸통: 투명도 높여 겹침 비침 방지, border 제거 */}
          <div className="relative px-5 py-3 rounded-2xl bg-white/95 backdrop-blur-lg">
            {/* 꼬리: 몸통과 동일한 색, border 없음, 살짝 둥글게 */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/95 rotate-45 rounded-sm" />
            <p className="relative z-10 text-base font-semibold text-gray-700 tracking-wide">
              {displayedText}
            </p>
          </div>
        </div>
      </div>
    );
  },
);

export default function MainPage() {
  // 말하는 중일 때만 true (타이핑 시작 ~ 타이핑 완료)
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 타이핑 트리거 텍스트만 관리
  const [triggerText, setTriggerText] = useState('');

  // 캐릭터 얼굴 디자인 옵션
  const [faceType, setFaceType] = useState(0);

  // 입모양 애니메이션 (isSpeaking일 때만 뻐끔거림)
  const [mouthOpenRadius, setMouthOpenRadius] = useState(2);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTriggerText('서영님 눈물 닦고 할 일 하세요');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // isSpeaking이 true일 때만 입 움직임
  // cleanup에서 reset하여 effect body 내 동기 setState 경고 회피
  useEffect(() => {
    if (!isSpeaking) return;
    const ani = setInterval(() => {
      setMouthOpenRadius((prev) => (prev === 2 ? 8 : 2));
    }, 150);
    return () => {
      clearInterval(ani);
      setMouthOpenRadius(2); // interval 정리 시 입 닫기
    };
  }, [isSpeaking]);

  const changeFace = () => setFaceType((prev) => (prev + 1) % 6);

  // useCallback으로 안정적인 함수 레퍼런스 보장 (SpeechBubble deps 경고 해결)
  const handleSpeakStart = useCallback(() => setIsSpeaking(true), []);
  const handleSpeakEnd = useCallback(() => setIsSpeaking(false), []);

  // 알림 데이터 타입 및 상태
  type Alarm = { id: number; message: string; isRead: boolean; time: string; type: 'follow' | 'system' };
  const [alarms, setAlarms] = useState<Alarm[]>([
    { id: 1, message: '김싸피님이 팔로우를 요청했습니다.', isRead: false, time: '방금 전', type: 'follow' },
    { id: 2, message: '오후 6시부터 서비스 점검이 예정되어 있습니다.', isRead: true, time: '1시간 전', type: 'system' },
  ]);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

  // 알림 관리 함수
  const handleReadAllAlarms = () => setAlarms(prev => prev.map(a => ({ ...a, isRead: true })));
  const handleDeleteAllAlarms = () => setAlarms([]);
  const handleAlarmClick = (alarm: Alarm) => {
    setAlarms(prev => prev.map(a => a.id === alarm.id ? { ...a, isRead: true } : a));
    if (alarm.type === 'follow') {
      setIsAlarmModalOpen(false);
      setIsUsersModalOpen(true);
    }
  };

  // AI 모드 상태 (일반/학습/상담)
  type Mode = 'normal' | 'study' | 'counseling';
  const [currentMode, setCurrentMode] = useState<Mode>('normal');

  const modes: { id: Mode; label: string; icon: React.ReactNode; color: string; glow: string }[] = [
    {
      id: 'normal',
      label: '일반 모드',
      icon: <Home className="w-7 h-7 text-white" />,
      color: 'from-teal-200/60 to-cyan-100/40',
      glow: 'bg-teal-200/50',
    },
    {
      id: 'study',
      label: '학습 모드',
      icon: <BookOpen className="w-7 h-7 text-white" />,
      color: 'from-pink-200/60 to-rose-100/40',
      glow: 'bg-pink-200/50',
    },
    {
      id: 'counseling',
      label: '상담 모드',
      icon: <Heart className="w-7 h-7 text-white" />,
      color: 'from-indigo-200/60 to-blue-100/40',
      glow: 'bg-indigo-300/50',
    },
  ];

  // 배경 그라데이션 (현재는 애니메이션 CSS 클래스로 구현)
  // 투명한 캐릭터를 위해 backdrop-blur 적용

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col justify-between">
      {/* 프리미엄 유체 배경 (Canvas 기반 실시간 셰이더) */}
      <AnimatedBackground />

      {/* 상단 헤더 */}
      <header className="flex justify-between items-center px-5 py-2 w-full z-10 text-gray-700">
        <div className="text-3xl font-extrabold tracking-wider text-white drop-shadow-md">
          SSARVIS
        </div>
        <div className="flex gap-4">
          <button className="p-2 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm transition">
            <Maximize className="w-6 h-6" />
          </button>
          <button onClick={() => setIsAlarmModalOpen(!isAlarmModalOpen)} className="relative p-2 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm transition">
            <Bell className="w-6 h-6" />
            {alarms.some(a => !a.isRead) && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-400 rounded-full border border-white" />
            )}
          </button>
          <button className="p-2 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-sm transition">
            <User className="w-6 h-6" />
          </button>
        </div>
        
        {/* 알림 드롭다운 (헤더 바로 아래 우측 위치) */}
        {isAlarmModalOpen && (
          <div className="absolute top-[60px] right-20 z-50 w-[300px] bg-white/30 backdrop-blur-2xl rounded-3xl p-5 shadow-2xl border border-white/40 text-gray-800 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex flex-col gap-4 mb-6">
              {alarms.length === 0 ? (
                <div className="text-center text-sm text-gray-600 py-4">알림이 없습니다.</div>
              ) : (
                alarms.map((alarm, idx) => (
                  <React.Fragment key={alarm.id}>
                    {idx > 0 && <div className="h-px bg-white/40 my-1" />}
                    <div 
                      onClick={() => handleAlarmClick(alarm)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${!alarm.isRead ? 'bg-red-400' : 'bg-transparent'}`} />
                      <p className={`text-sm tracking-tight transition ${alarm.isRead ? 'text-gray-500' : 'text-gray-800 font-medium group-hover:text-black'}`}>
                        {alarm.message}
                      </p>
                    </div>
                  </React.Fragment>
                ))
              )}
            </div>
            
            <div className="flex justify-end items-center gap-2 text-xs text-white drop-shadow-md font-medium">
              <button onClick={handleDeleteAllAlarms} className="hover:text-white/80 transition">전체 삭제</button>
              <span className="text-white/60">|</span>
              <button onClick={handleReadAllAlarms} className="hover:text-white/80 transition">모두 읽음</button>
            </div>
          </div>
        )}
      </header>

      {/* 메인 뷰 (캐릭터 중앙) */}
      <main className="flex-1 flex items-center justify-center relative w-full h-full">
        {/* 사이드 패널 (좌측) - 호버 시 모드 선택 모달 슬라이드인 */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 group flex flex-col items-start gap-3">
          {/* 모드 선택 패널: group-hover 시 쓰윽 나타남 */}
          <div
            className="
              flex flex-col gap-2 p-3 rounded-3xl
              bg-white/20 backdrop-blur-xl border border-white/40 shadow-2xl
              transition-all duration-500 ease-out
              opacity-0 translate-x-[-10px] pointer-events-none
              group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto
            "
          >
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setCurrentMode(mode.id)}
                className={`
                  relative w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1
                  bg-gradient-to-br ${mode.color}
                  border-2 transition-all duration-300
                  ${
                    currentMode === mode.id
                      ? 'border-white/80 scale-105 shadow-lg'
                      : 'border-white/20 hover:border-white/50 hover:scale-105'
                  }
                `}
              >
                {/* 선택된 모드 내부 글로우 */}
                {currentMode === mode.id && (
                  <div className={`absolute inset-0 rounded-2xl ${mode.glow} blur-md -z-10`} />
                )}
                {mode.icon}
                {/* 선택 시 모드명 레이블 */}
                {currentMode === mode.id && (
                  <span className="absolute -right-1 -top-1 w-3 h-3 bg-white rounded-full border-2 border-white/60 shadow" />
                )}
              </button>
            ))}
          </div>

          {/* 현재 모드 표시 + 호버 트리거 역할의 아이콘 버튼 */}
          <div
            className="
              w-16 h-16 rounded-2xl
              bg-white/20 backdrop-blur-md border border-white/40 shadow-lg
              flex flex-col items-center justify-center gap-1
              transition-all duration-300 hover:bg-white/30
            "
          >
            {modes.find((m) => m.id === currentMode)?.icon}
            <span className="text-[9px] font-semibold text-white/80 leading-none">
              {currentMode === 'normal' ? '일반' : currentMode === 'study' ? '학습' : '상담'}
            </span>
          </div>

          {/* 구분 — 표정/목소리 전환 버튼 (별도 분리) */}
          <button
            onClick={changeFace}
            className="
              w-16 h-16 rounded-2xl
              bg-white/20 backdrop-blur-md border border-white/40 shadow-lg
              flex flex-col items-center justify-center gap-1
              hover:bg-white/30 transition-all duration-300
            "
          >
            <Smile className="w-7 h-7 text-gray-600" />
            <span className="text-[9px] font-semibold text-gray-600/80 leading-none">표정</span>
          </button>
        </div>

        {/* 우측 슬라이딩 사이드바 (친구 목록) */}
        <motion.div 
          className="absolute top-0 right-0 h-full w-[350px] bg-white/20 backdrop-blur-2xl border-l border-white/40 shadow-2xl z-40 flex flex-col"
          initial={false}
          animate={{ x: isUsersModalOpen ? 0 : 350 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          drag="x"
          dragConstraints={{ left: 0, right: 350 }}
          dragElastic={0.05}
          onDragEnd={(e, info) => {
            // 오른쪽으로 스와이프하면 닫기, 왼쪽으로 스와이프하면 열기
            if (info.offset.x > 50 || info.velocity.x > 500) {
              setIsUsersModalOpen(false);
            } else if (info.offset.x < -50 || info.velocity.x < -500) {
              setIsUsersModalOpen(true);
            }
          }}
        >
          {/* 당기기 탭 (사이드바에 부착되어 항상 보임) */}
          <button 
            onClick={() => setIsUsersModalOpen(!isUsersModalOpen)}
            className="absolute -left-[70px] top-1/2 -translate-y-1/2 w-[70px] h-32 bg-white/20 backdrop-blur-xl border border-r-0 border-white/40 rounded-l-3xl shadow-lg flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <Users className="w-7 h-7 text-gray-700" />
          </button>

          {/* 사이드바 내용 */}
          <div className="p-6 flex justify-between items-center border-b border-white/30">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-pink-500" /> 친구 목록
            </h2>
            <button onClick={() => setIsUsersModalOpen(false)} className="p-2 hover:bg-white/40 rounded-full transition">
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-600 p-6">
            <div className="p-4 bg-white/30 rounded-full mb-4">
              <UserPlus className="w-12 h-12 text-gray-500" />
            </div>
            <p className="text-sm leading-relaxed">친구 목록 및 팔로우 관리 UI가<br/>들어갈 공간입니다. (추후 구현 예정)</p>
          </div>
        </motion.div>

        {/* 중앙 캐릭터 컨테이너 */}
        <div className="relative flex flex-col items-center justify-center">
          {/* 메인 캐릭터 영역 하위로 오디오 파형 이동 (여기서는 삭제) */}

          <div className="absolute left-[-100px] top-1/2 -translate-y-1/2">
            <button className="p-4 rounded-full bg-white/30 backdrop-blur-md shadow-lg border border-white/50 hover:bg-white/40 transition">
              <Mic className="w-6 h-6 text-green-600" />
            </button>
          </div>

          <div className="absolute right-[-100px] top-1/2 -translate-y-1/2">
            <button className="p-4 rounded-full bg-white/30 backdrop-blur-md shadow-lg border border-white/50 hover:bg-white/40 transition">
              <Lock className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          {/* 메인 캐릭터 구체 (Three.js Real 3D) 및 오디오 파형(Visualizer) 통합 컨테이너 */}
          <div
            className="w-[350px] h-[350px] relative z-10 flex items-center justify-center
                          transition-transform hover:scale-105 duration-500"
          >
            {/* 시각화 링을 구체와 완벽하게 동일한 중심점에 배치 (inset-0) */}
            <WaveformRing isActive={isSpeaking} />
            <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} className="w-full h-full">
              <ambientLight intensity={0.6} />
              {/* 정면 강한 스포트라이트 → 구체 상단에 선명한 하이라이트 */}
              <spotLight
                position={[0, 5, 5]}
                intensity={6}
                angle={0.4}
                penumbra={0.6}
                color="#ffffff"
                castShadow
              />
              {/* 좌측 보조 포인트라이트 → 유리 측면 반짝임 */}
              <pointLight position={[-4, 3, 3]} intensity={4} color="#e0f0ff" />
              {/* 우측 하단 반사광 → 구체 하단 림라이팅 */}
              <pointLight position={[4, -2, 2]} intensity={3} color="#ffeeff" />
              <directionalLight position={[10, 10, 10]} intensity={2.0} color="#ffffff" />
              <Environment preset="studio" />
              <Character3D faceType={faceType} mouthOpenRadius={mouthOpenRadius} />
            </Canvas>
          </div>

          {/* 대화 말풍선: 타이핑 state를 SpeechBubble 내부에 완전히 캡슐화 */}
          <SpeechBubble
            triggerText={triggerText}
            onStart={handleSpeakStart}
            onEnd={handleSpeakEnd}
          />
        </div>
      </main>
    </div>
  );
}

// Three.js 3D 캐릭터 컴포넌트
function Character3D({ faceType, mouthOpenRadius }: { faceType: number; mouthOpenRadius: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      // 화면 중앙 기준 -1 ~ 1 정규화 위치
      mouse.current.x = (e.clientX - centerX) / centerX;
      mouse.current.y = (e.clientY - centerY) / centerY;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    // 마우스 위치에 따른 부드러운 회전 보간
    // 회전 반경(민감도)
    const targetX = mouse.current.y * Math.PI * 0.15;
    const targetY = mouse.current.x * Math.PI * 0.15;

    // delta 값을 이용해 프레임과 독립적인 부드러운 애니메이션(lerp) 적용
    // 회전 계산 간격을 조금 더 부드럽게 조정
    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      targetX,
      10 * delta,
    );
    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      targetY,
      10 * delta,
    );
  });

  return (
    <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.3}>
      <Sphere ref={meshRef} args={[1.5, 64, 64]}>
        {/* 유리 질감을 극대화하기 위한 물리 기반 머티리얼 속성 조정 */}
        <meshPhysicalMaterial
          transmission={0.35} // 투과율을 낮춰 배경색이 덜 비치고 흰끼가 살아남
          thickness={2.0} // 두께감을 올려 굴절을 더 풍부하게
          roughness={0.0} // 0에 가까울수록 거울처럼 매끄럽게 = 선명한 반짝임
          ior={1.6} // 굴절률 높여 유리/크리스탈 느낌 강화
          color="#ffffff"
          emissive="#c8e8ff" // 은은한 하늘빛 자가발광으로 블링 느낌
          emissiveIntensity={0.25} // 발광 강도 높임
          clearcoat={1} // 코팅 최대
          clearcoatRoughness={0.0} // 코팅 표면도 완전 매끄럽게 → 가장 선명한 반짝임
          opacity={0.95}
          transparent={true}
          envMapIntensity={4.0} // 환경 반사 강도 대폭 올려 주변 빛이 구체에 풍부하게 반사
        />
        {/* 구체 겉표면에 HTML 기반 얼굴 UI 매핑 및 크기 확대 */}
        <Html
          transform
          sprite={false}
          position={[0, 0, 1.48]} // 구체 표면 (반지름 1.5)과 거의 비슷하게 배치
          distanceFactor={0.8} // 1.2 -> 0.8 로 대폭 줄여서 화면에 훨씬 더 크게 보이게 설정
          zIndexRange={[100, 0]}
        >
          {/* 표정 컨테이너 크기 자체를 기존 280px에서 400px로 더욱 확대 */}
          <div className="w-[400px] h-[400px] pointer-events-none flex items-center justify-center transform-style-3d scale-150">
            <FaceDesign type={faceType} mouthOpenRadius={mouthOpenRadius} />
          </div>
        </Html>
      </Sphere>
    </Float>
  );
}

// 6가지 얼굴 디자인 컴포넌트
function FaceDesign({ type, mouthOpenRadius }: { type: number; mouthOpenRadius: number }) {
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
    <div className="absolute inset-0 w-full h-full flex items-center justify-center transform-style-3d">
      {renderEyebrows()}

      {type === 0 && (
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

      {type === 1 && (
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

      {type === 2 && (
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

      {type === 3 && (
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

      {type === 4 && (
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

      {type === 5 && (
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
