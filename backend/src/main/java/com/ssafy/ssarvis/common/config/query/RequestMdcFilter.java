package com.ssafy.ssarvis.common.config.query;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(1) // 가능한 한 빨리 실행
public class RequestMdcFilter extends OncePerRequestFilter {

    private static final String MDC_KEY = "requestUri";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
        throws ServletException, IOException {
        try {
            String uri = request.getRequestURI();
            String query = request.getQueryString();
            MDC.put(MDC_KEY, query != null ? uri + "?" + query : uri);
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY); // 메모리 누수 방지
        }
    }
}
