## Docker Run

일반 실행:

```powershell
docker compose up -d --build
```

실행 후 확인:

- API Base URL: `http://127.0.0.1:8000`
- Qdrant: `http://127.0.0.1:6333/dashboard`

## Testing

### 전체 테스트 실행

```powershell
uv run pytest tests -vv
```

현재 통합 테스트는 다음 흐름을 검증합니다.

- Prompt 생성 API
- Voice 등록, 삭제 API
- Chat WebSocket 정상 응답 및 Chat 결과의 Qdrant 저장
- Chat 잘못된 요청 처리

## API Specification

Base URL:

- Docker 로 실행한 경우: `http://127.0.0.1:8000`

### 1. Health Check

`GET /api/health`

응답 `200`

```json
{
  "status": "ok"
}
```

### 2. Prompt 생성/업데이트

`POST /api/v1/prompt`

설명:

- QnA 목록을 받아 시스템 프롬프트를 생성합니다.
- `systemPrompt`를 함께 보내면 기존 시스템 프롬프트를 기반으로 업데이트합니다.

요청 바디:

```json
{
  "systemPrompt": "나는 차분하고 따뜻한 말투를 유지한다.",
  "qna": [
    {
      "question": "어떤 사람 같아?",
      "answer": "차분하고 유머가 있어."
    },
    {
      "question": "말투는 어때?",
      "answer": "부드럽고 솔직해."
    }
  ]
}
```

필드:

- `systemPrompt`: 선택, 기존 시스템 프롬프트. 값이 있으면 업데이트 모드로 동작
- `qna`: 배열, 최소 1개
- `qna[].question`: 문자열
- `qna[].answer`: 문자열

응답 `201`

```json
{
  "message": "시스템 프롬프트 생성 성공",
  "data": {
    "systemPrompt": "..."
  }
}
```

주요 에러:

- `422 Unprocessable Entity`: 요청 바디 구조가 잘못된 경우

### 3. Voice 등록

`POST /api/v1/voice`

요청 형식:

- `multipart/form-data`

폼 필드:

- `audio`: 업로드 파일
- `audioText`: 문자열

예시:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/voice \
  -F "audio=@sample.wav" \
  -F "audioText=안녕하세요. 테스트 음성입니다."
```

응답 `201`

```json
{
  "message": "음성 등록 성공",
  "data": {
    "voiceId": "voice-id-123"
  }
}
```

주요 에러:

- `422 Unprocessable Entity`: `audio` 또는 `audioText` 누락
- `500` 계열: `ffmpeg` 변환 실패 또는 외부 음성 서비스 실패

### 4. Voice 삭제

`DELETE /api/v1/voice`

요청 바디:

```json
{
  "voiceId": "voice-id-123"
}
```

응답 `200`

```json
{
  "message": "음성 삭제 성공",
  "data": {}
}
```

주요 에러:

- `422 Unprocessable Entity`: `voiceId` 누락
- `500` 계열: 외부 음성 서비스 삭제 실패

### 5. Chat WebSocket

`WS /api/v1/chat`

설명:

- 연결 후 클라이언트는 첫 메시지로 JSON 요청을 보냅니다.
- 서버는 텍스트 응답과 음성 응답을 순서대로 전송합니다.
- 음성은 `voice.delta` 텍스트 이벤트 뒤에 청크 바이너리가 이어지고, 마지막에 `voice.end` 뒤로 최종 WebM 바이너리 프레임 1개가 추가로 이어집니다.
- 기본 동작은 요청 1건 처리 후 연결 종료입니다.
- `WS /api/v1/chat?keepAlive=true`로 연결하면 같은 WebSocket 연결에서 여러 JSON 요청을 순차적으로 보낼 수 있습니다.

쿼리 파라미터:

- `keepAlive`: 선택, 기본값 `false`. `true`이면 응답 완료 후 연결을 유지하고 다음 요청을 계속 받을 수 있음

클라이언트 요청 예시:

```json
{
  "sessionId": "manual-session-1",
  "userId": 101,
  "chatSessionType": "AI_AI",
  "chatMode": "DAILY",
  "memoryPolicy": "GENERAL",
  "isFollowing": true,
  "systemPrompt": "친절한 친구처럼 대답해.",
  "history": [
    {"role": "user", "content": "지난번 이야기 기억나?"},
    {"role": "assistant",  "content": "응, 기억하고 있어."}
  ],
  "text": "무슨 이야기를 했더라?",
  "voiceId": "qwen-tts-vc-user_voice-voice-20260321001254226-67c9"
}
```

필드 제약:

- `sessionId`: 대화를 구분하는 고유값, String
- `userId`: 사용자 식별 ID, Long
- `chatSessionType`: 채팅 세션 타입, `USER_AI | AVATAR_AI | AI_AI`
- `chatMode`: 대화 모드, `DAILY | STUDY | COUNSEL | PERSONA`
- `memoryPolicy`: 메모리 저장 정책, `GENERAL | SECRET`
- `isFollowing`: 선택, 기본값 `null`. `true`이면 민감정보 발설 주의 가이드가 추가 적용됨
- `systemPrompt`: AI의 페르소나, String
- `history`: 선택, 기본값 `[]`, 최대 30개
- `history[].role`: 발화자, `system | user | assistant`
- `history[].content`: 대화 내용, String
- `text`: 사용자 입력, String
- `voiceId`: 음성 ID, String

추가 동작:

- `chatSessionType`이 `AI_AI`이면 서버는 해당 주제에 대해 두 AI가 짧게 논의하도록 유도하는 시스템 프롬프트를 추가합니다.

정상 이벤트 순서:

1. `text.start`
2. `text.end`
3. `voice.start`
4. `voice.delta`
5. 바이너리 프레임(webm chunk)
6. `voice.delta`
7. 바이너리 프레임(webm chunk)
8. ...
9. `voice.end`
10. 바이너리 프레임(webm 전체 파일)
11. 연결 종료 (`keepAlive=false`인 경우)

`keepAlive=true` 동작:

- 한 요청의 이벤트 전송이 끝나도 연결은 유지됩니다.
- 클라이언트는 같은 연결에 다음 JSON 요청을 다시 보낼 수 있습니다.
- 잘못된 요청이 들어오면 `error` 이벤트를 반환하며, 연결은 유지됩니다.

이벤트 예시:

```json
{
  "type": "text.start",
  "sessionId": "session-general-1",
  "payload": {}
}
```

```json
{
  "type": "text.end",
  "sessionId": "session-general-1",
  "sequence": 0,
  "payload": {
    "text": "안녕! 나는 오늘도 괜찮아. 너는 어때?"
  }
}
```

```json
{
  "type": "voice.start",
  "sessionId": "session-general-1",
  "payload": {}
}
```

```json
{
  "type": "voice.delta",
  "sessionId": "session-general-1",
  "sequence": 0,
  "payload": {
    "mimeType": "audio/webm"
  }
}
```

```json
{
  "type": "voice.end",
  "sessionId": "session-general-1",
  "sequence": 3,
  "payload": {
    "mimeType": "audio/webm"
  }
}
```

에러 이벤트 예시:

```json
{
  "type": "error",
  "detail": "Invalid chat request",
  "payload": {
    "code": "invalid_request",
    "errors": [
      {
        "type": "string_too_short",
        "loc": ["sessionId"],
        "msg": "...",
        "input": "   "
      }
    ]
  }
}
```

현재 구현된 에러 코드:

- `invalid_request`
- `voice_encoding_failed`
- `chat_error`
- `internal_error`

비고:

- 각 `voice.delta` 이벤트 뒤에는 chunk 바이너리 프레임이 옵니다.
- `voice.end` 이벤트 뒤에는 JSON이 아닌 최종 오디오 바이너리 프레임이 한 번 더 옵니다.
- `keepAlive=false`이면 에러 응답 후 연결이 종료될 수 있습니다.
- `keepAlive=true`이면 요청 단위 에러 후에도 연결을 계속 사용할 수 있습니다.
