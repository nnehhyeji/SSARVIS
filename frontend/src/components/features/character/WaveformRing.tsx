import { useEffect, useRef } from 'react';

// ─── WaveformRing ───
// 역할: AI가 음성을 출력할 때 캐릭터 구체 주변에 표시되는 파형 SVG 링
// - 별도의 고성능 컴포넌트로 분리하여 React 리렌더링과 독립적으로 애니메이션이 유지됩니다.
// - isActive가 true일 때 setInterval로 SVG 라인의 y1 값을 무작위로 변경합니다.
// - isActive가 false이면 라인 높이를 기본값으로 복귀합니다.

interface WaveformRingProps {
  isActive: boolean;
}

export default function WaveformRing({ isActive }: WaveformRingProps) {
  const linesRef = useRef<(SVGLineElement | null)[]>([]);

  useEffect(() => {
    let aniInterval: ReturnType<typeof setInterval>;
    if (isActive) {
      aniInterval = setInterval(() => {
        linesRef.current.forEach((line) => {
          if (!line) return;
          const length = 20 + Math.random() * 25;
          line.setAttribute('y1', String(45 - length));
        });
      }, 80); // 80ms 간격으로 빠르게 파형 통통 튀도록
    } else {
      // 비활성화 시 기본값으로 복귀
      linesRef.current.forEach((line) => {
        if (!line) return;
        line.setAttribute('y1', '25'); // length = 20
      });
    }
    return () => clearInterval(aniInterval);
  }, [isActive]);

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500 z-[-1] ${isActive ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* 캐릭터 구체보다 큰 450px 사이즈로 테두리에 표시되도록 함 */}
      <svg viewBox="0 0 450 450" className="w-[450px] h-[450px] absolute">
        <g>
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = (i * 360) / 60;
            return (
              <line
                key={i}
                ref={(el) => {
                  linesRef.current[i] = el;
                }}
                x1="225"
                y1="25"
                x2="225"
                y2="45"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="3"
                strokeLinecap="round"
                transform={`rotate(${angle} 225 225)`}
                className="transition-all duration-75 uppercase"
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
