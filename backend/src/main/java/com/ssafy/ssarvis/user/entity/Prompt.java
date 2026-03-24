package com.ssafy.ssarvis.user.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Entity
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "prompts")
public class Prompt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @JoinColumn(name = "user_id")
    @ManyToOne(fetch = FetchType.LAZY)
    private User user;

    @NotNull
    @Column(name = "prompt_text", columnDefinition = "TEXT")
    private String promptText;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "prompt_type")
    private PromptType promptType;

}
