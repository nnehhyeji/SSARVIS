# Backend Agent

## Ownership

- Owns `backend/`
- Coordinates API contracts with frontend and AI, but backend code is the source of truth here

## Mission

Maintain the Spring Boot application that provides user/auth/follow/notification APIs, persists relational and document data, and relays chat traffic between the browser and the AI service.

## Current System Understanding

### Service role

- Entry point is `backend/src/main/java/com/ssafy/ssarvis/SsarvisApplication.java`.
- The backend is the central application server:
  - REST API provider
  - authenticated WebSocket endpoint provider
  - MySQL/MongoDB/Redis client
  - S3 uploader
  - OAuth/JWT auth provider
  - relay between frontend chat sockets and FastAPI AI sockets

### Major domains

- `auth/`: login, token reissue/logout, OAuth callback, voice-lock settings
- `user/`: signup, profile, email verification, profile-image upload, visibility toggles
- `follow/`: request/accept/reject/delete follow, search, follower/follow lists, follow AI info
- `notification/`: notification APIs and SSE subscription
- `chat/`: session/message retrieval, WebSocket chat streaming, AI relay, storage
- `voice/`: voice enrollment, prompt generation, evaluation-related APIs
- `assistant/`: assistant metadata and repository support
- `common/`: security, websocket, redis, s3, swagger, slow-query, exception, scheduler support

### Request/response and persistence model

#### Auth and user

- `auth/controller/AuthController.java` returns access tokens in the JSON body and authorization header, and sets refresh token cookies.
- `user/controller/UserController.java` handles signup, duplicate checks, email verification, profile reads/updates, profile-image upload, and account deletion.
- Persistence appears relational through JPA entities/repositories in `user/`, `auth/`, `follow/`, `voice/`, `notification/`, and `assistant/`.

#### Chat

- REST endpoints for chat history live in `chat/controller/ChatController.java`.
- Active conversation transport is WebSocket-based:
  - backend endpoint registration is in `common/config/WebSocketConfig.java`
  - authenticated endpoint: `/ws/chat`
  - guest endpoint: `/ws/guest/chat`
- `chat/service/AiRequestRelayService.java` bridges a frontend WebSocket session to a FastAPI WebSocket session.
- `chat/interceptor/FastApiWebSocketHandler.java` forwards AI text/binary frames back to the browser and stores final AI outputs asynchronously.
- MongoDB is used for chat documents:
  - `chat/document/ChatSessionDocument.java`
  - `chat/document/ChatMessageDocument.java`
  - repositories under `chat/repository/`
- AI output audio/text is buffered, then stored after the final binary frame arrives.

#### Notifications

- SSE subscribe endpoint is `notification/controller/SseController.java`.
- Redis-backed publish/subscribe support exists in `common/sse/RedisMessagePublisher.java`, `RedisMessageSubscriber.java`, and `SseEmitterManager.java`.
- Notification records also have JPA entities/repositories in `notification/`.

#### Voice / AI helper APIs

- `voice/controller/VoiceController.java` exposes voice upload, prompt generation, evaluation prompt generation, voice info, and evaluation list endpoints.
- This area appears to call the AI service and persist user-linked voice/prompt/evaluation data.

### Security and integration points

- `common/config/SecurityConfig.java` wires stateless Spring Security with `JwtAuthenticationHeaderFilter`.
- JWT parsing/utilities live in:
  - `auth/util/JwtUtil.java`
  - `auth/filter/JwtAuthenticationHeaderFilter.java`
- WebSocket auth is handled by `auth/interceptor/JwtAuthenticationWebSocketInterceptor.java`.
- OAuth2 client config targets Kakao in `application.yaml`.
- External integrations visible from config/dependencies:
  - MySQL via JPA
  - MongoDB for chat documents
  - Redis for SSE/pubsub
  - AWS S3 / CloudFront
  - Gmail SMTP
  - FastAPI AI server over WebSocket and HTTP
  - Slack/Mattermost webhooks

### Runtime dependencies from config

- `backend/build.gradle`
  - Spring Boot 3.5
  - Java 21
  - JPA, Security, Validation, Actuator, OAuth2 client
  - MongoDB, Redis, WebSocket, WebFlux
  - JWT
  - Swagger
  - AWS SDK S3
  - Mail
- `backend/src/main/resources/application.yaml`
  - MySQL datasource through P6Spy driver
  - Redis host/port
  - Mongo URI
  - multipart limits
  - JPA `ddl-auto: update`
  - S3 bucket + CloudFront domain
  - AI server URL and FastAPI WebSocket URL
  - Kakao OAuth settings
  - JWT secret + expirations

## Risks / Unclear Spots

- `SecurityConfig` currently permits all requests with `.anyRequest().permitAll()`. JWT extraction still runs, but authorization enforcement is effectively relaxed unless handled elsewhere.
- I did not trace every service implementation end-to-end, so domain-specific business rules should be confirmed in `service/impl/` classes before changing behavior.
- Some file contents include broken text encoding in comments/messages; endpoint structure and integration wiring are still readable.

## Key Files

- `backend/src/main/java/com/ssafy/ssarvis/SsarvisApplication.java`
- `backend/src/main/resources/application.yaml`
- `backend/build.gradle`
- `backend/src/main/java/com/ssafy/ssarvis/common/config/SecurityConfig.java`
- `backend/src/main/java/com/ssafy/ssarvis/common/config/WebSocketConfig.java`
- `backend/src/main/java/com/ssafy/ssarvis/auth/controller/AuthController.java`
- `backend/src/main/java/com/ssafy/ssarvis/user/controller/UserController.java`
- `backend/src/main/java/com/ssafy/ssarvis/follow/controller/FollowController.java`
- `backend/src/main/java/com/ssafy/ssarvis/chat/controller/ChatController.java`
- `backend/src/main/java/com/ssafy/ssarvis/chat/service/AiRequestRelayService.java`
- `backend/src/main/java/com/ssafy/ssarvis/chat/interceptor/FastApiWebSocketHandler.java`
- `backend/src/main/java/com/ssafy/ssarvis/voice/controller/VoiceController.java`
- `backend/src/main/java/com/ssafy/ssarvis/notification/controller/SseController.java`
