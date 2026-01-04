package com.example.bulkemail.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "policy_settings")
@Getter
@Setter
public class PolicySettings {
    @Id
    private Long id;

    @Column(nullable = false)
    private String orgWideRule;

    @Column(nullable = false)
    private String departmentRule;

    @Column(nullable = false)
    private Integer maxTestRecipients;

    @Column(nullable = false)
    private Integer defaultThrottlePerMinute;

    @Column(nullable = false)
    private Integer sendWindowHours;

    private Long notificationSmtpAccountId;

    private Long notificationSenderIdentityId;
}
