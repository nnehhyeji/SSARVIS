import axiosInstance from './axiosInstance';

export interface PromptResponse {
  message: string;
  data: {
    systemPrompt: string;
  };
}

export interface VoiceRegisterResponse {
  message: string;
  data: {
    modelId: string;
    message: string;
  };
}

export interface VoiceInfoResponse {
  message: string;
  data: {
    modelId: string;
    voiceStt: string;
  };
}

/**
 * [Q&A 기반] AI 시스템 프롬프트 생성/저장 요청
 * POST /api/v1/ai/prompts
 */
export async function postGeneratePrompt(
  qna: { question: string; answer: string }[],
): Promise<PromptResponse> {
  // AI 연산은 오래 걸릴 수 있으므로 타임아웃을 60초로 연장
  const response = await axiosInstance.post<PromptResponse>(
    '/ai/prompts',
    { qna },
    { timeout: 60000 },
  );
  return response.data;
}

/**
 * [Voice] 사용자 음성 등록/추론 학습 요청 (Multipart FormData)
 * POST /api/v1/ai/voices
 */
export async function postRegisterVoice(
  audioBlob: Blob,
  sttText: string,
): Promise<VoiceRegisterResponse> {
  const formData = new FormData();
  formData.append('audio_file', audioBlob, 'voice.webm');
  formData.append('stt_text', sttText);

  const response = await axiosInstance.post<VoiceRegisterResponse>('/ai/voices', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // AI 연산은 오래 걸릴 수 있으므로 타임아웃을 60초로 연장
  });
  return response.data;
}

/**
 * [Voice] 사용자 음성 모델 정보 조회
 * GET /api/v1/ai/voices
 */
export async function getUserVoiceModel(): Promise<VoiceInfoResponse> {
  const response = await axiosInstance.get<VoiceInfoResponse>('/ai/voices');
  return response.data;
}
