package com.example.bulkemail.dto;

import com.example.bulkemail.entity.RecipientStatus;
import lombok.Data;

import java.time.Instant;

@Data
public class CampaignRecipientReportDto {
    private String email;
    private String fullName;
    private RecipientStatus status;
    private String lastError;
    private Integer retryCount;
    private Instant updatedAt;
}
