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
  label?: string;
  waveformColor?: string;
  waveformSize?: number;
  showWaveform?: boolean;
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
  showWaveform = true,
}: CharacterSceneProps) {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {showWaveform && (
        <WaveformRing isActive={isSpeaking && isMicOn} color={waveformColor} size={waveformSize} />
      )}

      <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} className="h-full w-full">
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

      {label && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/50 bg-white/40 px-4 py-1 text-xs font-bold text-gray-700 backdrop-blur-md">
          {label}
        </div>
      )}
    </div>
  );
}
