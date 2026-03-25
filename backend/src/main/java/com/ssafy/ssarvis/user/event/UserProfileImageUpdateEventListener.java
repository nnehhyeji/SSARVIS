package com.ssafy.ssarvis.user.event;

import com.ssafy.ssarvis.chat.service.ChatSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class UserProfileImageUpdateEventListener {

    private final ChatSessionService chatSessionService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleUserProfileUpdate(UserProfileImageUpdateEvent event) {
        chatSessionService.updateChatSessionTargetUsers(event.targetUserId,
            event.newTargetUserProfileImageUrl);
    }
}
