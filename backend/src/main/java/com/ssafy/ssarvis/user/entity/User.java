package com.ssafy.ssarvis.user.entity;

import com.ssafy.ssarvis.common.constant.Constants;
import com.ssafy.ssarvis.common.entity.BaseTime;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PRIVATE)
@Table(name = "users")
public class User extends BaseTime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    private String email;

    @NotNull
    private String password;

    @NotNull
    private String nickname;

    @Column(name = "voice_password")
    private String voicePassword;

    @NotNull
    @Column(name = "profile_image")
    @Builder.Default
    private String profileImage = Constants.DEFAULT_PROFILE_IMAGE;

    @NotNull
    @Column(name = "view_count", columnDefinition = "INT UNSIGNED")
    private Long viewCount;

}
