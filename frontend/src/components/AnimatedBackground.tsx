import { memo, useRef, useMemo, useEffect } from 'react';
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

// 외부에서 색상을 주입받을 수 있도록 Uniforms(uColor~)가 추가된 프래그먼트 셰이더
const fragmentShader = `
uniform float uTime;
uniform vec2 uResolution;

// 외부에서 주입받는 색상들 (HEX -> RGB 자동 변환됨)
uniform vec3 uColorBaseTop;
uniform vec3 uColorBaseBottom;
uniform vec3 uColorPurple;
uniform vec3 uColorTeal;
uniform vec3 uColorPink;
uniform vec3 uColorMint;
uniform vec3 uColorPlume;
uniform vec3 uColorStreak;

varying vec2 vUv;

// 3D 심플렉스 노이즈 알고리즘
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
    vec2 uv = vUv;
    vec2 p = vec2(uv.x * (uResolution.x / uResolution.y), uv.y);
    float t = uTime * 0.05;
    
    // 일렁이는 공간 왜곡
    float qx = snoise(vec3(p * 1.5, t));
    float qy = snoise(vec3(p * 1.5 + vec2(5.2, 1.3), t));
    vec2 q = vec2(qx, qy);
    
    float rx = snoise(vec3(p * 2.0 + q * 1.5 + vec2(1.7, 9.2), t * 1.2));
    float ry = snoise(vec3(p * 2.0 + q * 1.5 + vec2(8.3, 2.8), t * 1.2));
    vec2 r = vec2(rx, ry);
    vec2 warped = uv + r * 0.25;

    float f = snoise(vec3(warped * 2.5, t));
    f = f * 0.5 + 0.5;

    // 하드코딩된 소수점 대신 주입받은 색상 변수(uColor~) 사용
    vec3 color = mix(uColorBaseBottom, uColorBaseTop, uv.y);
    
    float maskPurple = smoothstep(0.65, 0.0, distance(warped, vec2(0.85, 0.82)));
    color = mix(color, uColorPurple, maskPurple * 0.92);

    float maskTeal = smoothstep(0.55, 0.0, distance(warped, vec2(0.58, 0.42)));
    color = mix(color, uColorTeal, maskTeal * 0.88);

    float maskPink = smoothstep(0.60, 0.05, distance(warped, vec2(0.92, 0.35)));
    color = mix(color, uColorPink, maskPink * 0.95);

    float maskMint = smoothstep(0.50, 0.0, distance(warped, vec2(0.05, 0.2)));
    color = mix(color, uColorMint, maskMint * 0.65);

    float maskWhite = smoothstep(0.3, 0.75, f);
    maskWhite *= smoothstep(0.75, 0.1, abs(warped.x - 0.38));
    color = mix(color, uColorPlume, maskWhite * 0.98);

    float streak = smoothstep(0.5, 0.9, snoise(vec3(uv * 3.0 + q, t * 1.5)));
    color = mix(color, uColorStreak, streak * 0.35);

    // 필름 그레인 노이즈
    float grainVal = hash(uv * (fract(uTime) + 1.0));
    color += (grainVal - 0.5) * 0.15;

    // 비네팅
    float dist = length(uv - 0.5);
    color *= smoothstep(0.9, 0.3, dist * 0.5 + 0.2);

    gl_FragColor = vec4(color, 1.0);
}
`;

// 외부에서 자유롭게 바꿀 수 있도록 Props 타입 정의
interface AnimatedBackgroundProps {
  baseTop?: string;
  baseBottom?: string;
  purple?: string;
  teal?: string;
  pink?: string;
  mint?: string;
  plume?: string;
  streak?: string;
}

const ShaderPlane = ({
  baseTop = '#D8EBF1',
  baseBottom = '#A8D6E5',
  purple = '#98AFD9',
  teal = '#AAC4DF',
  pink = '#E2CDDD',
  mint = '#D7EBEA',
  plume = '#FCFAFE',
  streak = '#E3ECF1',
}: AnimatedBackgroundProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();

  // Uniforms 초기 세팅 (리사이징 최적화: 빈 deps 배열로 1회만 생성)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(0, 0) },
      uColorBaseTop: { value: new THREE.Color(baseTop) },
      uColorBaseBottom: { value: new THREE.Color(baseBottom) },
      uColorPurple: { value: new THREE.Color(purple) },
      uColorTeal: { value: new THREE.Color(teal) },
      uColorPink: { value: new THREE.Color(pink) },
      uColorMint: { value: new THREE.Color(mint) },
      uColorPlume: { value: new THREE.Color(plume) },
      uColorStreak: { value: new THREE.Color(streak) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // 외부에서 Props로 HEX 색상이 변경되면 실시간으로 셰이더에 반영
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uColorBaseTop.value.set(baseTop);
      materialRef.current.uniforms.uColorBaseBottom.value.set(baseBottom);
      materialRef.current.uniforms.uColorPurple.value.set(purple);
      materialRef.current.uniforms.uColorTeal.value.set(teal);
      materialRef.current.uniforms.uColorPink.value.set(pink);
      materialRef.current.uniforms.uColorMint.value.set(mint);
      materialRef.current.uniforms.uColorPlume.value.set(plume);
      materialRef.current.uniforms.uColorStreak.value.set(streak);
    }
  }, [baseTop, baseBottom, purple, teal, pink, mint, plume, streak]);

  useFrame((state) => {
    if (materialRef.current) {
      // getElapsedTime(): 탭 이탈 후 복귀해도 자연스럽게 시간이 이어짐
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      // 매 프레임 해상도 업데이트: 리사이즈 시 끊김 없이 대응
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

// React.memo: Props(각 색상 문자열)가 바뀌지 않으면 리렌더링 차단
// 타이핑 애니메이션 state 변화가 Canvas WebGL 루프에 전혀 간섭하지 않음
const AnimatedBackground = memo(function AnimatedBackground(props: AnimatedBackgroundProps) {
  return (
    <div className="fixed inset-0 z-[-2] pointer-events-none bg-[#FCFAFE]">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1], zoom: 1 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        frameloop="always"
      >
        <ShaderPlane {...props} />
      </Canvas>
    </div>
  );
});

export default AnimatedBackground;
