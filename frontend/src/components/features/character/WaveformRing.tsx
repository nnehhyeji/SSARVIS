import { useEffect, useRef } from 'react';

// ─── WaveformRing ───
// 역할: AI가 음성을 출력할 때 캐릭터 구체 주변에 표시되는 파형 SVG 링
// - 별도의 고성능 컴포넌트로 분리하여 React 리렌더링과 독립적으로 애니메이션이 유지됩니다.
// - isActive가 true일 때 setInterval로 SVG 라인의 y1 값을 무작위로 변경합니다.
// - isActive가 false이면 라인 높이를 기본값으로 복귀합니다.

interface WaveformRingProps {
  isActive: boolean;
  color?: string;
  size?: number;
}

export default function WaveformRing({
  isActive,
  color = 'rgba(255,255,255,0.7)',
  size = 450,
}: WaveformRingProps) {
  const linesRef = useRef<(SVGLineElement | null)[]>([]);
  const center = size / 2;

  useEffect(() => {
    let aniInterval: ReturnType<typeof setInterval>;
    if (isActive) {
      aniInterval = setInterval(() => {
        linesRef.current.forEach((line) => {
          if (!line) return;
          const length = size * 0.05 + Math.random() * (size * 0.08);
          line.setAttribute('y1', String(size * 0.1 - length));
        });
      }, 80);
    } else {
      linesRef.current.forEach((line) => {
        if (!line) return;
        line.setAttribute('y1', String(size * 0.06));
      });
    }
    return () => clearInterval(aniInterval);
  }, [isActive, size]);

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500 z-[-1] ${isActive ? 'opacity-100' : 'opacity-0'}`}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="absolute"
        style={{ width: size, height: size }}
      >
        <g>
          {Array.from({ length: 70 }).map((_, i) => {
            const angle = (i * 360) / 70;
            return (
              <line
                key={i}
                ref={(el) => {
                  linesRef.current[i] = el;
                }}
                x1={center}
                y1={size * 0.06}
                x2={center}
                y2={size * 0.1}
                stroke={color}
                strokeWidth={size * 0.008}
                strokeLinecap="round"
                transform={`rotate(${angle} ${center} ${center})`}
                className="transition-all duration-75"
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
