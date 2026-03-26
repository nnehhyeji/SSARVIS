import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
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

      <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} className="w-full h-full">
        <ambientLight intensity={isLockMode ? 0.3 : 0.6} />
        <pointLight position={[-4, 3, 3]} intensity={isLockMode ? 10 : 4} color="#e0f0ff" />
        <pointLight position={[4, -2, 2]} intensity={isLockMode ? 8 : 3} color="#ffeeff" />
        <directionalLight
          position={[10, 10, 10]}
          intensity={isLockMode ? 4.0 : 2.0}
          color="#ffffff"
        />
        <Environment preset="studio" />

        <Character3D
          faceType={faceType}
          mouthOpenRadius={mouthOpenRadius}
          mode={mode}
          isLockMode={isLockMode}
        />
      </Canvas>

      {/* 라벨 표시 (나의 AI 등) */}
      {label && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white/40 backdrop-blur-md px-4 py-1 rounded-full border border-white/50 text-xs font-bold text-gray-700 whitespace-nowrap">
          {label}
        </div>
      )}
    </div>
  );
}
