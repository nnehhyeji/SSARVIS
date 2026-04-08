import { WAKE_WORD } from '../../constants/voice';

export const WAITING_FOR_AI_TEXT = 'AI 응답을 준비하고 있어요...';
export const WAKE_GUIDE_TEXT = `"${WAKE_WORD}"라고 말하면 음성 인식을 시작할게요.`;
export const WAKE_DETECTED_TEXT = `${WAKE_WORD}를 들었어요. 하고 싶은 말을 이어서 해주세요.`;
export const SPEECH_LISTENING_TEXT = '말씀을 듣고 있어요...';
export const CONNECTION_ERROR_TEXT = '서버 연결에 문제가 있어요. 다시 시도해주세요.';
export const LOGIN_EXPIRED_TEXT = '로그인이 만료되었어요. 다시 로그인해주세요.';
export const VOICE_REGISTRATION_REQUIRED_TEXT =
  '대화를 시작하려면 음성 등록이 필요해요. 온보딩에서 내 음성을 먼저 등록해주세요.';
export const SECRET_MODE_GREETING =
  '시크릿 모드예요. 이 대화는 기록되지 않고 지금 이 순간에만 머물러요.';
export const SPEECH_STOPPED_TEXT = '음성 듣기를 종료했어요.';
