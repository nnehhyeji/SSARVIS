package com.ssafy.ssarvis.user.entity;

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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Entity
@Builder
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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

    @NotNull
    private String customId;

    @NotNull
    private String description;

    @Column(name = "voice_password")
    private String voicePassword;

    @NotNull
    @Column(name = "is_voice_lock_active")
    @Builder.Default
    private Boolean isVoiceLockActive = false;

    @NotNull
    @Column(name = "is_accept_prompt")
    @Builder.Default
    private Boolean isAcceptPrompt = true;

    @NotNull
    @Column(name = "is_public")
    @Builder.Default
    private Boolean isPublic = true;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @Column(name = "costume")
    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private Costume costume = Costume.init();

    @NotNull
    @Column(name = "withdraw_status")
    @Builder.Default
    private Boolean withdrawStatus = false;

    @NotNull
    @Column(name = "view_count", columnDefinition = "INT UNSIGNED")
    @Builder.Default
    private Long viewCount = 0L;

    @Column(name = "voice_lock_timeout")
    @Builder.Default
    private Long voiceLockTimeout = 1800L;

    public static User create(String email, String password, String nickname, String customId) {
        return User.builder()
            .email(email)
            .password(password)
            .nickname(nickname)
            .customId(customId)
            .description(defaultDescription(nickname))
            .build();
    }

    private static String defaultDescription(String nickname) {
        return String.format("어서와, %s AI와 대화를 시작해봐", nickname);
    }

    public void updateProfileImage(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    public void update(
        String password,
        String nickname,
        String description,
        Costume costume,
        String voicePassword,
        String customId
    ) {
        if (password != null) {
            this.password = password;
        }
        if (nickname != null) {
            this.nickname = nickname;
        }
        if (description != null) {
            this.description = description;
        }
        if (costume != null) {
            this.costume = costume;
        }
        if (voicePassword != null) {
            this.isVoiceLockActive = true;
            this.voicePassword = voicePassword;
        }
        if (customId != null) {
            this.customId = customId;
        }
    }

    public void deleteUser() {
        this.withdrawStatus = true;
    }

    public void updateUserVoicePassword(String voicePassword, Long timeout) {
        this.voicePassword = voicePassword;
        this.voiceLockTimeout = timeout;
        this.isVoiceLockActive = true;
    }

    public void deleteUserVoicePassword() {
        this.voicePassword = null;
        this.isVoiceLockActive = false;
    }

    public void toggleAcceptPrompt() {
        this.isAcceptPrompt = !this.isAcceptPrompt;
    }

    public void toggleProfile() {
        this.isPublic = !this.isPublic;
    }

    public void updateProfileVisibility(Boolean isPublic) {
        this.isPublic = isPublic;
    }

    public void deleteProfileImage() {
        this.profileImageUrl = null;
    }
}
