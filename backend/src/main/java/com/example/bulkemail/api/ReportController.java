package com.example.bulkemail.api;

import com.example.bulkemail.dto.CampaignRecipientReportDto;
import com.example.bulkemail.dto.ReportSummaryDto;
import com.example.bulkemail.entity.CampaignRecipient;
import com.example.bulkemail.repo.CampaignRecipientRepository;
import com.example.bulkemail.service.ReportService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@Tag(name = "Reports")
public class ReportController {
    private final ReportService reportService;
    private final CampaignRecipientRepository recipientRepository;

    public ReportController(ReportService reportService, CampaignRecipientRepository recipientRepository) {
        this.reportService = reportService;
        this.recipientRepository = recipientRepository;
    }

    @GetMapping("/campaigns/{campaignId}/summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','AUDITOR','APPROVER','SENDER')")
    public ReportSummaryDto summary(@PathVariable Long campaignId) {
        return reportService.summary(campaignId);
    }

    @GetMapping("/campaigns/{campaignId}/export")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','AUDITOR','APPROVER','SENDER')")
    public void export(@PathVariable Long campaignId, HttpServletResponse response) throws IOException {
        List<CampaignRecipient> recipients = recipientRepository.findByCampaignId(campaignId);
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=campaign-" + campaignId + "-recipients.csv");
        StringBuilder builder = new StringBuilder("email,fullName,status,lastError\n");
        for (CampaignRecipient recipient : recipients) {
            builder.append(recipient.getEmail()).append(',')
                    .append(clean(recipient.getFullName())).append(',')
                    .append(recipient.getStatus()).append(',')
                    .append(clean(recipient.getLastError())).append('\n');
        }
        response.getWriter().write(builder.toString());
    }

    @GetMapping("/campaigns/{campaignId}/recipients")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','AUDITOR','APPROVER','SENDER')")
    public List<CampaignRecipientReportDto> recipients(@PathVariable Long campaignId) {
        return recipientRepository.findByCampaignIdOrderByUpdatedAtDesc(campaignId).stream().map(recipient -> {
            CampaignRecipientReportDto dto = new CampaignRecipientReportDto();
            dto.setEmail(recipient.getEmail());
            dto.setFullName(recipient.getFullName());
            dto.setStatus(recipient.getStatus());
            dto.setLastError(recipient.getLastError());
            dto.setRetryCount(recipient.getRetryCount());
            dto.setUpdatedAt(recipient.getUpdatedAt());
            return dto;
        }).toList();
    }

    private String clean(String value) {
        if (value == null) {
            return "";
        }
        return value.replace(",", " ");
    }
}
