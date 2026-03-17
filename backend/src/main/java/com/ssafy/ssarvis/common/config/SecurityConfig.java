package com.ssafy.ssarvis.common.config;

import com.ssafy.ssarvis.auth.filter.JwtAuthenticationHeaderFilter;
import com.ssafy.ssarvis.auth.jwt.JwtProvider;
import com.ssafy.ssarvis.auth.service.CustomUserDetailService;
import com.ssafy.ssarvis.auth.service.RefreshTokenService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtProvider jwtProvider;
    private final CustomUserDetailService customUserDetailService;
    private final RefreshTokenService refreshTokenService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .csrf(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
//                .requestMatchers(
//                    "/api/auth/login",
//                    "/api/auth/signup",
//                    "/api/auth/reissue",
//                    "/error"
//                )
//                .permitAll()
//                .anyRequest().authenticated()
                
                // TODO: 추후 허용 url 설정
                    .anyRequest().permitAll()
            )
            .addFilterBefore(
                new JwtAuthenticationHeaderFilter(jwtProvider, customUserDetailService,
                    refreshTokenService),
                UsernamePasswordAuthenticationFilter.class
            )
            .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowCredentials(true);
        configuration.setAllowedOrigins(List.of(
            "http://localhost:8080",
            "https://localhost:8080",
            "http://localhost:3000",
            "https://localhost:3000"
//            "http://localhost:5173",
//            "https://localhost:5173"
        ));
        configuration.setAllowedMethods(List.of(
            "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of(
            HttpHeaders.AUTHORIZATION,
            "Set-Cookie",
            "Content-Type"
        ));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
