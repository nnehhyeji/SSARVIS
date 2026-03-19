package com.ssafy.ssarvis.voice.controller;

import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.common.dto.BaseResponse;
import com.ssafy.ssarvis.voice.dto.response.VoiceUploadResponseDto;
import com.ssafy.ssarvis.voice.service.VoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/voices")
public class VoiceController {

    private final VoiceService voiceService;

    @PostMapping(value = "/ai", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BaseResponse<VoiceUploadResponseDto>> uploadVoice(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @RequestPart("audio_file") MultipartFile audioFile,
        @RequestPart("stt_text") String sttText
    ) {
        Long userId = customUserDetails.getUserId();
        VoiceUploadResponseDto response = voiceService.uploadVoice(userId, audioFile, sttText);
        return ResponseEntity.ok(BaseResponse.success("음성 저장 성공", response));
    }
}
