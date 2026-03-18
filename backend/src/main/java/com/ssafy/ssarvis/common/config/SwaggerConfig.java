package com.ssafy.ssarvis.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityScheme.In;
import io.swagger.v3.oas.models.security.SecurityScheme.Type;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .info(new Info().title("ssarvis-server API 문서")
                .description("SSAFY 14기 특화 B203 ssarvis 서비스 API")
                .version("1.0")
            )
            .components(new Components()
                .addSecuritySchemes("bearerAuth", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT"))
                .addSecuritySchemes("cookieAuth", new SecurityScheme()
                    .type(Type.APIKEY)
                    .in(In.COOKIE)
                    .name("refreshtoken"))
            )
            .addSecurityItem(
                new SecurityRequirement()
                    .addList("bearerAuth")
                    .addList("cookieAuth")
            );
    }
}
