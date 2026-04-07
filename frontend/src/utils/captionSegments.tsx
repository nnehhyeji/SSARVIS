import type { ReactNode } from 'react';

export interface CaptionLineSegment {
  doneText: string;
  activeText: string;
  pendingText: string;
}

export function splitCaptionLineSegments(
  text: string,
  doneLength: number,
  activeLength: number,
): CaptionLineSegment[] {
  if (!text) return [];

  const safeDoneLength = Math.max(0, Math.min(doneLength, text.length));
  const safeActiveLength = Math.max(0, Math.min(activeLength, text.length - safeDoneLength));
  const lines = text.split('\n');
  const segments: CaptionLineSegment[] = [];

  let offset = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineStart = offset;
    const lineEnd = lineStart + line.length;

    const doneInLine = Math.max(0, Math.min(safeDoneLength - lineStart, line.length));
    const activeStart = Math.max(safeDoneLength, lineStart);
    const activeEnd = Math.min(safeDoneLength + safeActiveLength, lineEnd);
    const activeInLine = Math.max(0, activeEnd - activeStart);

    segments.push({
      doneText: line.slice(0, doneInLine),
      activeText: line.slice(doneInLine, doneInLine + activeInLine),
      pendingText: line.slice(doneInLine + activeInLine),
    });

    offset = lineEnd + 1;
  }

  return segments;
}

export function hasVisibleCaptionLine(
  segments: CaptionLineSegment[],
  allowBlankLines = false,
): boolean {
  return segments.some((line) => {
    const combined = `${line.doneText}${line.activeText}${line.pendingText}`;
    return allowBlankLines ? combined.length > 0 : combined.trim().length > 0;
  });
}

export function renderCaptionLine(
  line: CaptionLineSegment,
  doneNode: (text: string) => ReactNode,
  activeNode: (text: string) => ReactNode,
  pendingNode: (text: string) => ReactNode,
) {
  return (
    <>
      {line.doneText ? doneNode(line.doneText) : null}
      {line.activeText ? activeNode(line.activeText) : null}
      {line.pendingText ? pendingNode(line.pendingText) : null}
    </>
  );
}
