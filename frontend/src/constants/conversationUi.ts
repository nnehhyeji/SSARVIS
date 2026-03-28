export const CONVERSATION_UI = {
  titles: {
    assistant: '대화',
    home: '홈',
  },
  status: {
    aiSpeaking: 'AI 응답 중',
    userSpeaking: '말하는 중',
    awaiting: '골똘히 생각 중',
    awaitingVariants: ['골똘히 생각 중', '무슨 말 할지 고민 중', '감정이입 중'],
    idle: '말 걸어보기',
    textInput: '텍스트 입력 가능',
  },
  placeholder: {
    chatInput: '메시지를 입력해 대화를 이어가세요',
  },
  controls: {
    cancel: '중단',
    lock: '시크릿 모드',
    unlock: '일반 모드',
  },
} as const;

export const ACTIVE_SPEECH_COLOR = '#F7576E';
export const PENDING_TEXT_CLASS = 'text-[#D9D9D9]';
export const SIDEBAR_SAFE_PADDING = 'pl-[104px] md:pl-[120px] lg:pl-[132px]';
export const PAGE_INSET = 'px-8 pt-8 md:px-12 md:pt-12';
export const SINGLE_SPEAKER_BREAKPOINT = 1440;
