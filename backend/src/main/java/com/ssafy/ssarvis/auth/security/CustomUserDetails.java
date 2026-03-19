package com.ssafy.ssarvis.auth.security;

import com.ssafy.ssarvis.user.entity.User;
import java.util.Collection;
import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Getter
@RequiredArgsConstructor
public class CustomUserDetails implements UserDetails {

    private final Long userId;
    private final String email;   // 여기 email 넣음
    private final String password;
    private final Boolean withdrawStatus;
    private final Collection<? extends GrantedAuthority> authorities;

    public static CustomUserDetails of(User user) {
        return new CustomUserDetails(
            user.getId(),
            user.getEmail(),
            user.getPassword(),
            user.getWithdrawStatus(),
            List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return Boolean.TRUE.equals(withdrawStatus) ? false : true;
    }
}
