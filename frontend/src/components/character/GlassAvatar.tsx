import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useFaceStore } from '../../store/useFaceStore';

function AvatarFace({ isSpeaking }: { isSpeaking: boolean }) {
  const mouthRef = useRef<THREE.Group>(null);
  const { eyeType, mouthType, eyebrowType } = useFaceStore();

  useFrame((state) => {
    if (mouthRef.current && mouthType === 'o') {
      if (isSpeaking) {
        const scaleY = 1 + Math.sin(state.clock.elapsedTime * 15) * 0.5;
        mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, scaleY, 0.15);
      } else {
        mouthRef.current.scale.y = THREE.MathUtils.lerp(mouthRef.current.scale.y, 0.5, 0.1);
      }
    } else if (mouthRef.current) {
      mouthRef.current.scale.set(1, 1, 1);
    }
  });

  const darkColor = '#3a3a3a';
  const eyeColor = '#2a2a2a';

  const renderEye = (type: string, isLeft: boolean) => {
    const x = isLeft ? -0.22 : 0.22;
    if (type === 'sleepy') {
      return (
        <mesh position={[x, 0.05, 1.01]}>
          <boxGeometry args={[0.12, 0.025, 0.01]} />
          <meshBasicMaterial color={eyeColor} />
        </mesh>
      );
    }
    if (type === 'wow') {
      return (
        <mesh position={[x, 0.05, 1.01]}>
          <torusGeometry args={[0.06, 0.015, 16, 32]} />
          <meshBasicMaterial color={eyeColor} />
        </mesh>
      );
    }
    if (type === 'wink') {
      if (isLeft)
        return (
          <mesh position={[-0.22, 0.05, 1.01]}>
            <capsuleGeometry args={[0.03, 0.1, 4, 16]} />
            <meshBasicMaterial color={eyeColor} />
          </mesh>
        );
      return (
        <mesh position={[0.22, 0.05, 1.01]}>
          <boxGeometry args={[0.12, 0.025, 0.01]} />
          <meshBasicMaterial color={eyeColor} />
        </mesh>
      );
    }
    if (type === 'star') {
      return (
        <group position={[x, 0.05, 1.01]} rotation={[0, 0, Math.PI / 4]}>
          <mesh>
            <boxGeometry args={[0.15, 0.03, 0.01]} />
            <meshBasicMaterial color={eyeColor} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.03, 0.15, 0.01]} />
            <meshBasicMaterial color={eyeColor} />
          </mesh>
        </group>
      );
    }
    if (type === 'love') {
      return (
        <group position={[x, 0.05, 1.01]}>
          <mesh position={[-0.03, 0.03, 0]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshBasicMaterial color="#e85d75" />
          </mesh>
          <mesh position={[0.03, 0.03, 0]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshBasicMaterial color="#e85d75" />
          </mesh>
          <mesh position={[0, -0.02, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.08, 0.08, 0.01]} />
            <meshBasicMaterial color="#e85d75" />
          </mesh>
        </group>
      );
    }
    // default: 세로로 긴 작은 직사각형 눈
    return (
      <mesh position={[x, 0.05, 1.01]}>
        <capsuleGeometry args={[0.03, 0.1, 4, 16]} />
        <meshBasicMaterial color={eyeColor} />
      </mesh>
    );
  };

  return (
    <group>
      {/* 눈썹: 사진처럼 아주 작고 얇은 가로 대시 */}
      {eyebrowType !== 'none' && (
        <group>
          <mesh
            position={[-0.22, 0.22, 1.01]}
            rotation={[0, 0, eyebrowType === 'angry' ? -0.25 : eyebrowType === 'sad' ? 0.25 : 0]}
          >
            <boxGeometry args={[0.12, 0.025, 0.01]} />
            <meshBasicMaterial color={darkColor} />
          </mesh>
          <mesh
            position={[0.22, 0.22, 1.01]}
            rotation={[0, 0, eyebrowType === 'angry' ? 0.25 : eyebrowType === 'sad' ? -0.25 : 0]}
          >
            <boxGeometry args={[0.12, 0.025, 0.01]} />
            <meshBasicMaterial color={darkColor} />
          </mesh>
        </group>
      )}

      {renderEye(eyeType, true)}
      {renderEye(eyeType, false)}

      {/* 입 */}
      <group ref={mouthRef} position={[0, -0.18, 1.01]}>
        {mouthType === 'o' ? (
          <mesh>
            <torusGeometry args={[0.045, 0.018, 16, 32]} />
            <meshBasicMaterial color={eyeColor} />
          </mesh>
        ) : mouthType === 'smile' ? (
          <group>
            <mesh position={[-0.05, 0.02, 0]} rotation={[0, 0, -0.5]}>
              <boxGeometry args={[0.1, 0.025, 0.01]} />
              <meshBasicMaterial color={eyeColor} />
            </mesh>
            <mesh position={[0.05, 0.02, 0]} rotation={[0, 0, 0.5]}>
              <boxGeometry args={[0.1, 0.025, 0.01]} />
              <meshBasicMaterial color={eyeColor} />
            </mesh>
          </group>
        ) : (
          <mesh>
            <boxGeometry args={[0.1, 0.025, 0.01]} />
            <meshBasicMaterial color={eyeColor} />
          </mesh>
        )}
      </group>
    </group>
  );
}

function AvatarModel() {
  const [isSpeaking, setIsSpeaking] = useState(true);
  const bodyGroupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsSpeaking(Math.random() > 0.3);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useFrame((state) => {
    if (bodyGroupRef.current) {
      const targetX = (state.mouse.x * Math.PI) / 5;
      const targetY = (state.mouse.y * Math.PI) / 5;
      bodyGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        bodyGroupRef.current.rotation.y,
        targetX,
        0.08,
      );
      bodyGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        bodyGroupRef.current.rotation.x,
        -targetY,
        0.08,
      );
    }
  });

  return (
    <Float floatIntensity={1} speed={2} rotationIntensity={0.05}>
      <group ref={bodyGroupRef}>
        {/* 매트한 크림/화이트 불투명 구체 (사진과 일치) */}
        <Sphere args={[1.0, 64, 64]}>
          <meshStandardMaterial color="#f0ece8" roughness={0.6} metalness={0.0} />
        </Sphere>
        <AvatarFace isSpeaking={isSpeaking} />
      </group>
    </Float>
  );
}

export default function GlassAvatar() {
  return (
    <Canvas camera={{ position: [0, 0, 4.2], fov: 40 }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={1.8} />
      <directionalLight position={[5, 8, 8]} intensity={1.5} />
      <directionalLight position={[-3, -2, 5]} intensity={0.6} />
      <AvatarModel />
      <ContactShadows
        position={[0, -1.15, 0]}
        opacity={0.2}
        scale={4}
        blur={4}
        far={2.5}
        color="#c0d0e0"
      />
    </Canvas>
  );
}
