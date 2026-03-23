package com.ssafy.ssarvis.chat.interceptor;

import com.ssafy.ssarvis.chat.dto.IncomingTurnContext;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class IncomingTurnContextRegistry {

    private final Map<String, IncomingTurnContext> contextMap = new ConcurrentHashMap<>();

    public void put(String webSocketSessionId, IncomingTurnContext context) {
        contextMap.put(webSocketSessionId, context);
    }

    public IncomingTurnContext get(String webSocketSessionId) {
        return contextMap.get(webSocketSessionId);
    }

    public void remove(String webSocketSessionId) {
        contextMap.remove(webSocketSessionId);
    }

}