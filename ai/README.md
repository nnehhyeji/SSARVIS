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

### 2. Prompt 생성

`POST /api/v1/prompt`

설명:

- QnA 목록을 받아 시스템 프롬프트를 생성합니다.

요청 바디:

```json
{
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
- 음성은 `voice.delta` 텍스트 이벤트 뒤에 바이너리 프레임이 이어집니다.

클라이언트 요청 예시:

```json
{
  "sessionId": "manual-session-1",
  "userId": 101,
  "chatMode": "NORMAL",
  "memoryPolicy": "GENERAL",
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
- `chatMode`: 대화 모드, NORMAL | COUNSELING | STUDY
- `memoryPolicy`: 시크릿 모드 여부, GENERAL | SECRET
- `systemPrompt`: AI의 페르소나, String
- `history`: 선택, 기본값 `[]`
- `history[].role`: 발화자, SYSTEM | USER | ASSISTANT
- `history[].content`: 대화 내용, String
- `text`: 사용자 입력, String
- `voiceId`: 음성 ID, String

정상 이벤트 순서:

1. `text.start`
2. `text.end`
3. `voice.start`
4. `voice.delta`
5. 바이너리 프레임(webm)
6. `voice.delta`
7. 바이너리 프레임(webm)
...
8. `voice.end`
9. 연결 종료

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
  "payload": {}
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

- `voice.delta` 이벤트 뒤에는 JSON이 아닌 바이너리 프레임이 옵니다.