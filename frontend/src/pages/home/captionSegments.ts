export type CaptionSegments = {
  doneLength: number;
  activeLength: number;
};

export function getActiveSegment(text: string): CaptionSegments {
  const trimmed = text.trimEnd();
  if (!trimmed) return { doneLength: 0, activeLength: 0 };

  const lastWhitespace = Math.max(trimmed.lastIndexOf(' '), trimmed.lastIndexOf('\n'));
  const activeStart = lastWhitespace >= 0 ? lastWhitespace + 1 : 0;

  return {
    doneLength: activeStart,
    activeLength: trimmed.length - activeStart,
  };
}

export function getSegmentAroundIndex(text: string, index: number): CaptionSegments {
  const trimmed = text.trimEnd();
  if (!trimmed) return { doneLength: 0, activeLength: 0 };

  const clampedIndex = Math.max(0, Math.min(index, trimmed.length));
  const targetIndex = Math.max(0, Math.min(clampedIndex - 1, trimmed.length - 1));

  if (/\s/.test(trimmed[targetIndex] ?? '')) {
    return getActiveSegment(trimmed.slice(0, clampedIndex));
  }

  let activeStart = targetIndex;
  while (activeStart > 0 && !/\s/.test(trimmed[activeStart - 1])) {
    activeStart -= 1;
  }

  let activeEnd = targetIndex + 1;
  while (activeEnd < trimmed.length && !/\s/.test(trimmed[activeEnd])) {
    activeEnd += 1;
  }

  return {
    doneLength: activeStart,
    activeLength: activeEnd - activeStart,
  };
}

export function getDualCaptionSegments(
  text: string,
  isSpeaking: boolean,
  progress: number,
): CaptionSegments {
  if (!text.trim()) return { doneLength: 0, activeLength: 0 };
  if (!isSpeaking) return { doneLength: text.length, activeLength: 0 };

  const spokenLength = Math.max(0, Math.min(Math.floor(text.length * progress), text.length));
  if (spokenLength === 0) return { doneLength: 0, activeLength: 0 };
  return getSegmentAroundIndex(text, spokenLength);
}
