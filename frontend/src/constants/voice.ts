export const WAKE_WORD = '싸비스';

export const WAKE_WORD_ALIASES = [
  WAKE_WORD,
  '사비스',
  '싸비쓰',
  '서비스',
  '싸비쓰야',
  '비스',
  '싸비',
  '싸쓰',
] as const;

export function normalizeWakeWordText(text: string) {
  return text.replace(/\s+/g, '').toLowerCase();
}

export function containsWakeWord(text: string) {
  const normalized = normalizeWakeWordText(text);
  return WAKE_WORD_ALIASES.some((alias) =>
    normalized.includes(normalizeWakeWordText(alias)),
  );
}

export function extractSpeechAfterWakeWord(text: string): string {
  for (const alias of WAKE_WORD_ALIASES) {
    const index = text.indexOf(alias);
    if (index >= 0) {
      return text
        .slice(index + alias.length)
        .replace(/^[\s,.:;!?~'"`-]+/, '')
        .trim();
    }
  }
  return '';
}
