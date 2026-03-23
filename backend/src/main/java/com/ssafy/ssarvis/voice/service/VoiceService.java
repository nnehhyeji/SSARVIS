package com.ssafy.ssarvis.voice.service;

import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.voice.dto.request.EvaluationPromptRequestDto;
import com.ssafy.ssarvis.voice.dto.response.EvaluationPromptResponseDto;
import com.ssafy.ssarvis.voice.dto.response.PromptResponseDto;
import com.ssafy.ssarvis.voice.dto.response.VoiceInfoResponseDto;
import com.ssafy.ssarvis.voice.dto.response.VoiceUploadResponseDto;
import org.springframework.web.multipart.MultipartFile;

public interface VoiceService {

    VoiceUploadResponseDto uploadVoice(Long userId, MultipartFile audioFile, String sttTexts);

    PromptResponseDto generateSystemPrompt(Long userId, Object rawJson);

    EvaluationPromptResponseDto generateSystemPromptEvaluation(CustomUserDetails customUserDetails, Long targetUserId, EvaluationPromptRequestDto evaluationPromptRequestDto);

    VoiceInfoResponseDto getVoiceInfo(Long userId);
}
