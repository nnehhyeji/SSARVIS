import { memo, useEffect, useState } from 'react';

// ─── SpeechBubble ───
// 역할: AI가 말할 때 표시되는 타이핑 말풍선 컴포넌트
// - triggerText가 바뀌면 한 글자씩 타이핑 애니메이션을 실행합니다.
// - 타이핑 시작/종료 시 onStart / onEnd 콜백을 호출하여
//   부모 컴포넌트에서 입 모양 애니메이션을 동기화할 수 있습니다.
// - memo로 감싸서 triggerText가 바뀔 때만 리렌더링합니다.

interface SpeechBubbleProps {
  text: string;
  onStart?: () => void;
  onEnd?: () => void;
}

const SpeechBubble = memo(({ text, onStart, onEnd }: SpeechBubbleProps) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!text) return;
    let i = 0;
    let current = '';
    setDisplayedText('');
    if (onStart) onStart(); // 타이핑 시작 → 입 움직이기 시작
    const interval = setInterval(() => {
      if (i < text.length) {
        current += text.charAt(i);
        setDisplayedText(current);
        i++;
      } else {
        clearInterval(interval);
        if (onEnd) onEnd(); // 타이핑 완료 → 입 멈추기
      }
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (!displayedText) return null;

  return (
    <div className="mt-8 z-20">
      {/* drop-shadow 필터: 몸통+꼬리 전체 실루엣에 하나의 그림자 적용 */}
      <div className="relative drop-shadow-lg transition-opacity duration-300 transform opacity-100 translate-y-0">
        {/* 몸통: 투명도 높여 겹침 비침 방지, border 제거 */}
        <div className="relative px-5 py-3 rounded-2xl bg-white/95 backdrop-blur-lg">
          {/* 꼬리: 몸통과 동일한 색, border 없음, 살짝 둥글게 */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/95 rotate-45 rounded-sm" />
          <p className="relative z-10 text-base font-semibold text-gray-700 tracking-wide">
            {displayedText}
          </p>
        </div>
      </div>
    </div>
  );
});

SpeechBubble.displayName = 'SpeechBubble';

export default SpeechBubble;
