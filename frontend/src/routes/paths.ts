/**
 * 애플리케이션의 모든 경로 상수를 관리합니다.
 * 경로가 변경될 때 이 파일만 수정하면 됩니다.
 */
export const PATHS = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  TUTORIAL: '/tutorial',
  VISIT: (userId: string | number) => `/visit/${userId}`,
  VISIT_PARAM: '/visit/:userId',
  CARD: (userId: string | number) => `/card/${userId}`,
  CARD_PARAM: '/card/:userId',
  SETTINGS: '/settings',
  SETTINGS_PARAM: '/settings/:tab',
  PROFILE: '/profile',
  PERSONA: (userId: string | number) => `/persona/${userId}`,
  PERSONA_PARAM: '/persona/:userId',
  CHAT_ARCHIVE: (sessionId: string) => `/chat-archive/${sessionId}`,
  CHAT_ARCHIVE_PARAM: '/chat-archive/:sessionId',
} as const;
