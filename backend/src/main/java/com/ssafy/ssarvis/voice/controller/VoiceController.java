package com.ssafy.ssarvis.voice.controller;

import com.ssafy.ssarvis.auth.security.CustomUserDetails;
import com.ssafy.ssarvis.common.dto.BaseResponse;
import com.ssafy.ssarvis.voice.dto.request.EvaluationPromptRequestDto;
import com.ssafy.ssarvis.voice.dto.response.*;
import com.ssafy.ssarvis.voice.service.VoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/ai")
public class VoiceController {

    private final VoiceService voiceService;

    @PostMapping(value = "/voices", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BaseResponse<VoiceUploadResponseDto>> uploadVoice(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @RequestPart("audio_file") MultipartFile audioFile,
        @RequestPart("stt_text") String sttText
    ) {
        VoiceUploadResponseDto response = voiceService.uploadVoice(
            customUserDetails.getUserId(), audioFile, sttText);

        return ResponseEntity.ok(BaseResponse.success("음성 등록 요청 수락", response));
    }

    @PostMapping("/prompts") // 튜토리얼에서 사용
    public ResponseEntity<BaseResponse<PromptResponseDto>> createPrompt(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @RequestBody Object requestBody
    ) {
        PromptResponseDto response = voiceService.generateSystemPrompt(
            customUserDetails.getUserId(), requestBody);

        return ResponseEntity.ok(BaseResponse.success("시스템 프롬프트 생성 및 저장 성공", response));
    }

    @PostMapping("/prompts/{targetUserId}")
    public ResponseEntity<BaseResponse<EvaluationPromptResponseDto>> createPrompt(
        @AuthenticationPrincipal CustomUserDetails customUserDetails,
        @RequestBody EvaluationPromptRequestDto evaluationPromptRequestDto,
        @PathVariable("targetUserId") Long targetUserId
    ) {
        EvaluationPromptResponseDto response = voiceService.generateSystemPromptEvaluation(
            customUserDetails,        // 추가
            targetUserId,
            evaluationPromptRequestDto
        );
        return ResponseEntity.ok(BaseResponse.success("상대방 프롬프트 생성 및 저장 성공", response));
    }

    @GetMapping("/voices")
    public ResponseEntity<BaseResponse<VoiceInfoResponseDto>> getVoiceInfo(
        @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        VoiceInfoResponseDto response = voiceService.getVoiceInfo(customUserDetails.getUserId());

        return ResponseEntity.ok(BaseResponse.success("음성 정보 조회 성공", response));
    }

    @GetMapping("/evaluations")
    public ResponseEntity<BaseResponse<EvaluationListResponseDto>> getEvaluationList(
        @AuthenticationPrincipal CustomUserDetails customUserDetails
    ) {
        EvaluationListResponseDto response = voiceService.getEvaluationList(customUserDetails.getUserId());
        return ResponseEntity.ok(BaseResponse.success("평가 기록 조회 성공", response));
    }


}
