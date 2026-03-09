package com.ssafy.ssarvis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@EnableJpaAuditing
@SpringBootApplication
public class SsarvisApplication {

	public static void main(String[] args) {
		SpringApplication.run(SsarvisApplication.class, args);
	}

}
