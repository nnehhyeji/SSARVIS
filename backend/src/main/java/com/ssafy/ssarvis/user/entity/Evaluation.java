package com.ssafy.ssarvis.voice.entity;

import com.ssafy.ssarvis.user.entity.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Entity
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "evaluations")
public class Evaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @JoinColumn(name = "user_id")
    @ManyToOne(fetch = FetchType.LAZY)
    private User user;

    @NotNull
    @Column(name = "user_input_que", columnDefinition = "TEXT")
    private String userInputQue;

    @NotNull
    @Column(name = "user_input_ans", columnDefinition = "TEXT")
    private String userInputAns;

    @NotNull
    private String writer;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "prompt_type")
    private PromptType promptType;

}
