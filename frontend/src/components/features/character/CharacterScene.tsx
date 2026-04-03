import { Suspense, lazy } from 'react';

import WaveformRing from './WaveformRing';

export interface CharacterSceneProps {
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

const CharacterSceneCanvas = lazy(() => import('./CharacterSceneCanvas'));

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

      <Suspense fallback={<div className="h-full w-full rounded-full bg-white/30" />}>
        <CharacterSceneCanvas
          faceType={faceType}
          mouthOpenRadius={mouthOpenRadius}
          mode={mode}
          isLockMode={isLockMode}
        />
      </Suspense>

      {label && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/50 bg-white/40 px-4 py-1 text-xs font-bold text-gray-700 backdrop-blur-md">
          {label}
        </div>
      )}
    </div>
  );
}
