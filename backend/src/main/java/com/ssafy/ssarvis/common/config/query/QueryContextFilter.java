package com.ssafy.ssarvis.common.config.query;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Component
@Order(1)
public class QueryContextFilter implements Filter {

    public static final ThreadLocal<String> CURRENT_DOMAIN = new ThreadLocal<>();
    public static final ThreadLocal<String> CURRENT_URI = new ThreadLocal<>();

    private static final Map<String, String> PACKAGE_DOMAIN_MAP = Map.of(
        "assistant", "assistant",
        "follow", "follow",
        "auth", "auth",
        "notification", "notification",
        "user", "user",
        "voice", "voice"
    );

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
        throws IOException, ServletException {

        HttpServletRequest http = (HttpServletRequest) req;
        String uri = http.getRequestURI();

        CURRENT_URI.set(uri);
        CURRENT_DOMAIN.set(extractDomain(uri));

        try {
            chain.doFilter(req, res);
        } finally {
            CURRENT_DOMAIN.remove();
            CURRENT_URI.remove();
        }
    }

    private String extractDomain(String uri) {
        String[] parts = uri.replaceAll("^/+", "").split("/");

        for (String part : parts) {
            if (part.equals("api") || part.matches("v\\d+")) continue;

            String mapped = PACKAGE_DOMAIN_MAP.get(part.toLowerCase());
            if (mapped != null) return mapped;
        }
        return "unknown";
    }
}
