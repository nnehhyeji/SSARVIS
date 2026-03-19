package com.ssafy.ssarvis.notification.entity;

public enum NotificationTypeEnum {

    FOLLOW_REQUEST("친구 신청"),
    FOLLOW_ACCEPT("친구 수락");

    private final String description;

    NotificationTypeEnum(String description) {
        this.description = description;
    }

    public String getDescription() {
        return this.description;
    }

}
