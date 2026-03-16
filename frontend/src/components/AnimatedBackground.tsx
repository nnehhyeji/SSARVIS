import { memo, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// 단순하게 전체 화면을 덮는 정점 셰이더
const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// 프리미엄 3D 유체(Liquid) 그라데이션 + 섬세한 그레인 노이즈 프래그먼트 셰이더
const fragmentShader = `
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

// 3D 심플렉스 노이즈 알고리즘 (Ashima)
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0);
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0); 
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0)) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// 그레인 노이즈 생성을 위한 랜덤 함수
float hash(vec2 p) {
    return fract(sin(dot(p,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
    // 1. 기본 좌표 설정
    vec2 uv = vUv;
    // 비율에 맞춰 x축을 조정하여 모양이 찌그러지지 않게 함 (16:9 기준)
    vec2 p = vec2(uv.x * (uResolution.x / uResolution.y), uv.y);
    
    // 일렁이는 모션 속도 살짝 올리기 (멈춰있지 않게 명확히 움직임 유지)
    float t = uTime * 0.05;
    
    // 2. 일렁이는 공간 왜곡 (Domain Warping - FBM 변형)
    // 여러 겹의 노이즈를 쌓아서 마치 마블링이나 기름이 섞이는 듯한 부드러운 일렁임 생성
    float qx = snoise(vec3(p * 1.5, t));
    float qy = snoise(vec3(p * 1.5 + vec2(5.2, 1.3), t));
    vec2 q = vec2(qx, qy);
    
    float rx = snoise(vec3(p * 2.0 + q * 1.5 + vec2(1.7, 9.2), t * 1.2));
    float ry = snoise(vec3(p * 2.0 + q * 1.5 + vec2(8.3, 2.8), t * 1.2));
    vec2 r = vec2(rx, ry);
    
    // 이 노이즈를 사용해 좌표 자체를 뒤틀어버림 (일렁이는 효과의 핵심)
    vec2 warped = uv + r * 0.25;

    // 또 하나의 독립적인 노이즈 흐름 (흰색 파동 결정용)
    float f = snoise(vec3(warped * 2.5, t));
    f = f * 0.5 + 0.5; // 0 ~ 1 범위로

    // 3. 사진과 맞추는 공간별 컬러 맵핑
    // 베이스: 더 밝고 연한 하늘색 (사진의 왼쪽 전체 톤) - D8EBF1 ~ A8D6E5
    vec3 color = mix(vec3(0.722, 0.875, 0.914), vec3(0.847, 0.922, 0.945), uv.y);
    
    // 우측 상단 진한 라벤더/퍼플 블롭 (98AFD9) - 사진에서 우상단 진하게 있음
    float maskPurple = smoothstep(0.65, 0.0, distance(warped, vec2(0.85, 0.82)));
    color = mix(color, vec3(0.502, 0.596, 0.780), maskPurple * 0.92);

    // 중앙 오른쪽: 진한 틸(Teal) 블루 영역 - 사진의 중앙을 가르는 짙은 파란 구역
    float maskTeal = smoothstep(0.55, 0.0, distance(warped, vec2(0.58, 0.42)));
    color = mix(color, vec3(0.596, 0.780, 0.820), maskTeal * 0.88);

    // 우측 가장자리: 피치 핑크 / 크림 (E2CDDD) - 사진에서 우측에 강하게 나타남
    float maskPink = smoothstep(0.60, 0.05, distance(warped, vec2(0.92, 0.35)));
    color = mix(color, vec3(0.886, 0.790, 0.855), maskPink * 0.95);

    // 왼쪽 모서리 민트 틴트 (D7EBEA) - 사진 좌하단 미세한 민트 느낌
    float maskMint = smoothstep(0.50, 0.0, distance(warped, vec2(0.05, 0.2)));
    color = mix(color, vec3(0.780, 0.914, 0.906), maskMint * 0.65);

    // 4. 빛나는 중앙-왼쪽의 화이트 발광 플룸 (Luminous White Plume)
    // 사진처럼 좌-중앙에 걸쳐 넓고 지배적으로 자리잡게 범위 확장
    float maskWhite = smoothstep(0.3, 0.75, f);
    maskWhite *= smoothstep(0.75, 0.1, abs(warped.x - 0.38)); // 중앙보다 왼쪽에 배치
    color = mix(color, vec3(0.975, 0.980, 0.996), maskWhite * 0.98); // 더 밝고 넓은 화이트

    // 5. 부드러운 발광 스트릭 (E3ECF1 하이라이트)
    float streak = smoothstep(0.5, 0.9, snoise(vec3(uv * 3.0 + q, t * 1.5)));
    color = mix(color, vec3(0.890, 0.925, 0.945), streak * 0.35);

    // 6. 필름 그레인 노이즈 (그대로 유지)
    float grainVal = hash(uv * (fract(uTime) + 1.0));
    color += (grainVal - 0.5) * 0.06;

    // 미세한 비네팅
    float dist = length(uv - 0.5);
    color *= smoothstep(0.9, 0.3, dist * 0.5 + 0.2);

    gl_FragColor = vec4(color, 1.0);
}
`;

const ShaderPlane = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();

  // [수정 1] size 의존성 제거: 창 크기가 변해도 uniforms 객체를 재생성하지 않음
  // → 리사이징 시 셰이더가 초기화되면서 멈추는 현상 원천 차단
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(0, 0) }, // 초기값 0, 매 프레임 업데이트됨
    }),
    [], // 빈 배열: 마운트 시 1회만 생성, 이후 절대 파괴/재생성되지 않음
  );

  useFrame((state) => {
    if (materialRef.current) {
      // [수정 2] getElapsedTime(): 탭 이탈 후 복귀해도 실제 경과 시간으로 점프
      // → 탭 전환 후 돌아왔을 때 시간이 자연스럽게 이어짐
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();

      // [수정 3] 매 프레임 해상도 업데이트: 끊김 없이 창 크기 변화에 대응
      materialRef.current.uniforms.uResolution.value.set(size.width, size.height);
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
};

// React.memo로 감싸서 부모의 상태(state) 변화에 의한 리렌더링을 완전히 차단
// 타이핑 애니메이션 state가 바뀌어도 이 컴포넌트는 절대 재렌더링되지 않음
const AnimatedBackground = memo(function AnimatedBackground() {
  return (
    <>
      {/* 3D WebGL Canvas for Fluid Simulation */}
      <div className="fixed inset-0 z-[-2] pointer-events-none bg-[#FCFAFE]">
        <Canvas
          orthographic
          camera={{ position: [0, 0, 1], zoom: 1 }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          frameloop="always"
        >
          <ShaderPlane />
        </Canvas>
      </div>
    </>
  );
});

export default AnimatedBackground;
