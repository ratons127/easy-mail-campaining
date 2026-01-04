package com.example.bulkemail.dto;

import lombok.Data;

@Data
public class PolicySettingsResponse {
    private String orgWideRule;
    private String departmentRule;
    private Integer maxTestRecipients;
    private Integer defaultThrottlePerMinute;
    private Integer sendWindowHours;
    private Long notificationSmtpAccountId;
    private Long notificationSenderIdentityId;
}
