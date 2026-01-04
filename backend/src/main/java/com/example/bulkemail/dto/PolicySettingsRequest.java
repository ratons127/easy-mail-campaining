package com.example.bulkemail.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PolicySettingsRequest {
    @Schema(example = "HR_ADMIN+APPROVER")
    @NotBlank
    private String orgWideRule;

    @Schema(example = "DEPT_ADMIN")
    @NotBlank
    private String departmentRule;

    @NotNull
    @Min(1)
    private Integer maxTestRecipients;

    @NotNull
    @Min(1)
    private Integer defaultThrottlePerMinute;

    @NotNull
    @Min(1)
    private Integer sendWindowHours;

    @Schema(example = "1")
    @Min(0)
    private Long notificationSmtpAccountId;

    @Schema(example = "1")
    @Min(0)
    private Long notificationSenderIdentityId;
}
