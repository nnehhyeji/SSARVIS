import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';

import Character3D from './Character3D';

interface CharacterSceneCanvasProps {
  faceType: number;
  mouthOpenRadius: number;
  mode: string;
  isLockMode: boolean;
}

export default function CharacterSceneCanvas({
  faceType,
  mouthOpenRadius,
  mode,
  isLockMode,
}: CharacterSceneCanvasProps) {
  return (
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
  );
}
