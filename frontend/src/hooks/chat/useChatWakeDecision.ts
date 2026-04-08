import {
  containsChatWakeWord,
  extractChatSpeechAfterWakeWord,
  matchChatHomeRouteCommand,
  matchChatRouteCommand,
  normalizeChatCommandText,
} from './useChatCommands';

export type WakeDecision =
  | { type: 'route'; route: string }
  | { type: 'speech'; seededText: string }
  | { type: 'lock' }
  | { type: 'noop' };

interface DecideWakeActionArgs {
  heardText: string;
  userId?: number | null;
  canLock: boolean;
}

export function decideWakeAction({
  heardText,
  userId,
  canLock,
}: DecideWakeActionArgs): WakeDecision {
  const noSpaceText = normalizeChatCommandText(heardText);
  const routeAfterWakeWord = matchChatRouteCommand(
    extractChatSpeechAfterWakeWord(heardText),
  );
  const standaloneRoute = matchChatRouteCommand(heardText);

  if (containsChatWakeWord(heardText) && routeAfterWakeWord) {
    return { type: 'route', route: routeAfterWakeWord };
  }

  if (containsChatWakeWord(heardText)) {
    return {
      type: 'speech',
      seededText: extractChatSpeechAfterWakeWord(heardText),
    };
  }

  if (
    canLock &&
    (noSpaceText === '잠금모드' || noSpaceText === '잠궈줘' || noSpaceText === '비밀잠금')
  ) {
    return { type: 'lock' };
  }

  if (standaloneRoute) {
    return { type: 'route', route: standaloneRoute };
  }

  const standaloneHomeRoute = matchChatHomeRouteCommand(heardText, userId);
  if (standaloneHomeRoute) {
    return { type: 'route', route: standaloneHomeRoute };
  }

  return { type: 'noop' };
}
