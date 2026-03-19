package com.ssafy.ssarvis.notification.entity;


import com.ssafy.ssarvis.common.entity.BaseTime;
import com.ssafy.ssarvis.notification.dto.response.NotificationPayload;
import com.ssafy.ssarvis.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.type.SqlTypes;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Entity
@Table(name = "notifications")
public class Notification extends BaseTime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id")
    private User receiver;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "notification_type_id")
    private NotificationType notificationType;

    @Column(name = "payload")
    @JdbcTypeCode(SqlTypes.JSON)
    private NotificationPayload notificationPayload;

    @NotNull
    @Column(name = "message")
    private String message;

    @NotNull
    @Builder.Default
    @Column(name = "is_read")
    private Boolean isRead = false;

    public void markAsRead() {
        this.isRead = true;
    }

}
