import { PATHS } from '../../routes/paths';
import {
  containsWakeWord as sharedContainsWakeWord,
  extractSpeechAfterWakeWord as sharedExtractSpeechAfterWakeWord,
  normalizeWakeWordText,
} from '../../constants/voice';

export function normalizeChatCommandText(text: string) {
  return normalizeWakeWordText(text);
}

export function containsChatWakeWord(text: string) {
  return sharedContainsWakeWord(text);
}

export function extractChatSpeechAfterWakeWord(text: string): string {
  return sharedExtractSpeechAfterWakeWord(text);
}

export function matchChatRouteCommand(text: string): string | null {
  void text;
  return null;
}

export function matchChatHomeRouteCommand(text: string, userId?: number | null): string | null {
  const normalized = normalizeChatCommandText(text);

  if (normalized === '홈' || normalized === '메인으로' || normalized === '내프로필') {
    return userId ? PATHS.USER_HOME(userId) : PATHS.HOME;
  }

  return null;
}
