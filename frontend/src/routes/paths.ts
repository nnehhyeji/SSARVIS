/**
 * 애플리케이션의 모든 경로 상수를 관리합니다.
 * 경로가 변경될 때 이 파일만 수정하면 됩니다.
 */
export const PATHS = {
  /**
   * 홈 및 방문 관련
   * /:userId (나의 홈 or 친구 홈)
   */
  HOME: '/',
  USER_HOME: (userId: string | number) => `/${userId}`,
  USER_HOME_PARAM: '/:userId',

  // 인증
  LOGIN: '/login',
  SIGNUP: '/signup',
  TUTORIAL: '/tutorial',
  KAKAO_CALLBACK: '/auth/kakao/callback',

  // 기능별 독립 페이지
  ASSISTANT: '/assistant',
  NAMNA: '/namna', // 남이 보는 나 (Persona)
  CHAT: '/chat', // 대화 보관함 리스트
  GUEST_EXPERIENCE: '/guest', // 유명인 체험하기
  GUEST_COMPLETE: (modelId: string) => `/guest/complete/${modelId}`,
  GUEST_COMPLETE_PARAM: '/guest/complete/:modelId',
  CHAT_ARCHIVE: (sessionId: string) => `/chat-archive/${sessionId}`,
  CHAT_ARCHIVE_PARAM: '/chat-archive/:sessionId',

  // 설정 및 프로필
  SETTINGS: '/settings',
  SETTINGS_PARAM: '/settings/:tab',
  PROFILE: '/profile',

  // 기타 (기존 호환성 유지용 - 필요 시 제거 가능)
  VISIT: (userId: string | number) => `/visit/${userId}`,
  VISIT_PARAM: '/visit/:userId',
  CARD: (userId: string | number) => `/card/${userId}`,
  CARD_PARAM: '/card/:userId',
  PERSONA: (userId: string | number) => `/persona/${userId}`,
  PERSONA_PARAM: '/persona/:userId',
} as const;
