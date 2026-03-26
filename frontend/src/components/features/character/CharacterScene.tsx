import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import Character3D from './Character3D';
import WaveformRing from './WaveformRing';

interface CharacterSceneProps {
  faceType: number;
  mouthOpenRadius: number;
  mode: string;
  isLockMode: boolean;
  isSpeaking: boolean;
  isMicOn: boolean;
  label?: string; // "나의 AI" 또는 "사용자의 AI" 등의 라벨
  waveformColor?: string;
  waveformSize?: number;
}

export default function CharacterScene({
  faceType,
  mouthOpenRadius,
  mode,
  isLockMode,
  isSpeaking,
  isMicOn,
  label,
  waveformColor,
  waveformSize,
}: CharacterSceneProps) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* 음성 파형 비주얼라이저 */}
      <WaveformRing isActive={isSpeaking && isMicOn} color={waveformColor} size={waveformSize} />

      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        className="w-full h-full"
      >
        <ambientLight intensity={isLockMode ? 0.1 : 0.6} />
        <spotLight
          position={[0, 5, 5]}
          intensity={6}
          angle={0.4}
          penumbra={0.6}
          color="#ffffff"
          castShadow
        />
        <pointLight position={[-4, 3, 3]} intensity={isLockMode ? 15 : 4} color="#e0f0ff" />
        <pointLight position={[4, -2, 2]} intensity={isLockMode ? 12 : 3} color="#ffeeff" />
        <directionalLight
          position={[10, 10, 10]}
          intensity={isLockMode ? 6.0 : 2.0}
          color="#ffffff"
        />
        <Environment preset="studio" />

        {/* 잠금 모드 전용 특수 효과 (정중앙 수직 스포트라이트 및 바닥 그림자) */}
        {isLockMode && (
          <group>
            {/* 위에서 캐릭터를 향해 정통으로 쏟아지는 강력한 수직 조명 */}
            <spotLight
              position={[0, 15, 0]}
              target-position={[0, -2, 0]}
              angle={0.25}
              penumbra={0.7}
              intensity={800}
              castShadow
              color="#ffffff"
              shadow-mapSize={[2048, 2048]}
              shadow-camera-near={1}
              shadow-camera-far={20}
            />
            {/* 조명이 닿는 바닥 포인트 (더 선명하게 반사되도록 세팅) */}
            <mesh position={[0, -1.45, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[2, 64]} />
              <meshStandardMaterial 
                color="#ffffff" 
                emissive="#ffffff" 
                emissiveIntensity={0.3} 
                opacity={0.18} 
                transparent 
                roughness={0.1}
                metalness={0.2}
              />
            </mesh>
          </group>
        )}

        <Character3D
          faceType={faceType}
          mouthOpenRadius={mouthOpenRadius}
          mode={mode}
          isLockMode={isLockMode}
        />
      </Canvas>

      {/* 라벨 표시 (나의 AI 등) */}
      {label && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white/40 backdrop-blur-md px-4 py-1 rounded-full border border-white/50 text-xs font-bold text-gray-700 whitespace-nowrap">
          {label}
        </div>
      )}
    </div>
  );
}
