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
    @Builder.Default
    private String description = "안녕하세요";

    @Column(name = "voice_password")
    private String voicePassword;

    @NotNull
    @Column(name = "is_voice_lock_active")
    @Builder.Default
    private Boolean isVoiceLockActive = false;

    @NotNull
    @Column(name = "is_accept_prompt")
    @Builder.Default
    private Boolean isAcceptPrompt = false;

    @NotNull
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

    public static User create(String email, String password, String nickname) {
        return User.builder()
            .email(email)
            .password(password)
            .nickname(nickname)
            .build();
    }

    public void update(String password, String nickname, String description, Costume costume, String voicePassword) {
        if (password != null) this.password = password;
        if (nickname != null) this.nickname = nickname;
        if (description != null) this.description = description;
        if (costume != null) this.costume = costume;
        if (voicePassword != null) {
            this.isVoiceLockActive = true;
            this.voicePassword = voicePassword;
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

}
