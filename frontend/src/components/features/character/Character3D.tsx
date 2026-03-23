import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Html, Float } from '@react-three/drei';
import * as THREE from 'three';
import FaceDesign from './FaceDesign';

interface Character3DProps {
  faceType: number;
  mouthOpenRadius: number;
  mode: string;
  isLockMode: boolean;
}

export default function Character3D({
  faceType,
  mouthOpenRadius,
  mode,
  isLockMode,
}: Character3DProps) {
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

  const prevMode = useRef(mode);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;

    // 모드가 'persona'로 바뀌는 순간 y축 회전값을 -360도(Math.PI * 2) 빼줍니다.
    // 그러면 아래의 lerp 함수가 타겟값(0)을 향해 부드럽게 딱 1바퀴(+360도)만 돌려줍니다.
    if (mode === 'persona' && prevMode.current !== 'persona') {
      meshRef.current.rotation.y -= Math.PI * 2;
    }
    prevMode.current = mode;

    // 마우스 위치에 따른 부드러운 회전 보간
    const targetX = mouse.current.y * Math.PI * 0.15;
    const targetY = mouse.current.x * Math.PI * 0.15;

    // delta 값을 이용해 프레임과 독립적인 부드러운 애니메이션(lerp) 적용
    const safeDelta = Math.min(delta, 0.1);

    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      targetX,
      6 * safeDelta,
    );
    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      targetY,
      6 * safeDelta,
    );
  });

  return (
    <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.3}>
      <Sphere ref={meshRef} args={[1.5, 64, 64]}>
        {/* 유리 질감을 극대화하기 위한 물리 기반 머티리얼 속성 조정 */}
        <meshPhysicalMaterial
          transmission={isLockMode ? 0.05 : 0.35} // 잠금모드에선 거의 불투명하게 해서 하얀색 강조
          thickness={2.0}
          roughness={0.0}
          ior={1.6}
          color="#ffffff"
          emissive={isLockMode ? '#ffffff' : '#c8e8ff'}
          emissiveIntensity={isLockMode ? 1.8 : 0.25} // 잠금모드에서 발광 강화 (클리핑 방지를 위해 1.8로 조정)
          clearcoat={1}
          clearcoatRoughness={0.0}
          opacity={1}
          transparent={true}
          envMapIntensity={isLockMode ? 7.0 : 4.0} // 반사광 강화 (클리핑 방지를 위해 7.0으로 조정)
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
          <div className="w-[400px] h-[400px] pointer-events-none flex items-center justify-center [transform-style:preserve-3d] scale-150">
            <FaceDesign type={faceType} mouthOpenRadius={mouthOpenRadius} mode={mode} />
          </div>
        </Html>
      </Sphere>
    </Float>
  );
}
