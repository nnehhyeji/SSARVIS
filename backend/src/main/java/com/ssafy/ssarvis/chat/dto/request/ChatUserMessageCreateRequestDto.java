package com.ssafy.ssarvis.chat.dto.request;

import com.ssafy.ssarvis.chat.domain.AudioMeta;

public record ChatUserMessageCreateRequestDto (
    String sessionId,
    String text,
    AudioMeta audio
){

}
