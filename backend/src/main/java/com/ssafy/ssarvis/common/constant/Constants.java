package com.ssafy.ssarvis.common.constant;

public final class Constants {

    public static final String DEFAULT_PROFILE_IMAGE = "URL...";
    public static final String SSE_NOTIFICATION_CHANNEL = "sse:notification";

    // Auth
    public static final String DEFAULT_PROVIDER = "KAKAO";
    public static final String BEARER_PREFIX = "Bearer ";
    public static final String REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
    public static final String X_FORWARDED_FOR_HEADER_PREFIX = "X-Forwarded-For";

    // Chat
    public static final int SECRET_IDLE_TIMEOUT_HOURS = 6;
    public static final int GENERAL_IDLE_TIMEOUT_HOURS = 6;

    public static final String AUDIO_CONTENT_TYPE = "audio/webm";
    public static final String AUDIO_FILE_EXTENSION = ".webm";
    public static final String S3_USER_INPUT_AUDIO_DIRECTORY = "chat/input/%d/%s";
    public static final String S3_ASSISTANT_INPUT_AUDIO_DIRECTORY = "chat/output/%s/%s";
    public static final int CHAT_HISTORY_LIMIT = 30;

    public static final String USER_TEMP_FILE_PREFIX = "user_voice_%s_";
    public static final String AI_TEMP_FILE_PREFIX = "ai_response_%s_";
}
