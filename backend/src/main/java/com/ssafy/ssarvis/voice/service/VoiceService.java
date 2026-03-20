package com.ssafy.ssarvis.voice.service;

import com.ssafy.ssarvis.voice.dto.response.PromptResponseDto;
import com.ssafy.ssarvis.voice.dto.response.VoiceUploadResponseDto;
import org.springframework.web.multipart.MultipartFile;

public interface VoiceService {

    VoiceUploadResponseDto uploadVoice(Long userId, MultipartFile audioFile, String sttTexts);

    PromptResponseDto generateSystemPrompt(Long userId, Object rawJson);

}
