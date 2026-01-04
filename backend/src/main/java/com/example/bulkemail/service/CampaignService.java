package com.example.bulkemail.service;

import com.example.bulkemail.audit.AuditService;
import com.example.bulkemail.config.AppProperties;
import com.example.bulkemail.dto.*;
import com.example.bulkemail.entity.*;
import com.example.bulkemail.repo.*;
import com.example.bulkemail.service.PolicySettingsService;
import com.example.bulkemail.security.SecurityUtil;
import jakarta.transaction.Transactional;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class CampaignService {
    private final CampaignRepository campaignRepository;
    private final SenderIdentityRepository senderIdentityRepository;
    private final SmtpAccountRepository smtpAccountRepository;
    private final CampaignAudienceRepository campaignAudienceRepository;
    private final CampaignRecipientRepository campaignRecipientRepository;
    private final AudienceRepository audienceRepository;
    private final AudienceRuleRepository audienceRuleRepository;
    private final EmployeeRepository employeeRepository;
    private final AudienceService audienceService;
    private final ApprovalService approvalService;
    private final com.example.bulkemail.repo.ApprovalRepository approvalRepository;
    private final AppProperties appProperties;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final String attachmentsPath;
    private final PolicySettingsService policySettingsService;

    public CampaignService(CampaignRepository campaignRepository, SenderIdentityRepository senderIdentityRepository,
                           SmtpAccountRepository smtpAccountRepository, CampaignAudienceRepository campaignAudienceRepository,
                           CampaignRecipientRepository campaignRecipientRepository, AudienceRepository audienceRepository,
                           AudienceRuleRepository audienceRuleRepository, EmployeeRepository employeeRepository,
                           AudienceService audienceService, ApprovalService approvalService, AppProperties appProperties,
                           AuditService auditService,
                           com.example.bulkemail.repo.ApprovalRepository approvalRepository,
                           ObjectMapper objectMapper,
                           @Value("${app.attachments.path:/root/Attachments Files}") String attachmentsPath,
                           PolicySettingsService policySettingsService) {
        this.campaignRepository = campaignRepository;
        this.senderIdentityRepository = senderIdentityRepository;
        this.smtpAccountRepository = smtpAccountRepository;
        this.campaignAudienceRepository = campaignAudienceRepository;
        this.campaignRecipientRepository = campaignRecipientRepository;
        this.audienceRepository = audienceRepository;
        this.audienceRuleRepository = audienceRuleRepository;
        this.employeeRepository = employeeRepository;
        this.audienceService = audienceService;
        this.approvalService = approvalService;
        this.appProperties = appProperties;
        this.auditService = auditService;
        this.approvalRepository = approvalRepository;
        this.objectMapper = objectMapper;
        this.attachmentsPath = attachmentsPath;
        this.policySettingsService = policySettingsService;
    }

    public CampaignResponse create(CampaignCreateRequest request, String ip, String userAgent) {
        validateCampaignSmtpSelection(request.getSmtpAccountId(), request.getSenderIdentityId());
        Campaign campaign = new Campaign();
        campaign.setTitle(request.getTitle());
        campaign.setSubject(request.getSubject());
        campaign.setHtmlBody(request.getHtmlBody());
        campaign.setTextBody(request.getTextBody());
        campaign.setCategory(request.getCategory());
        campaign.setSenderIdentity(senderIdentityRepository.findById(request.getSenderIdentityId())
                .orElseThrow(() -> new IllegalArgumentException("Sender identity not found")));
        campaign.setSmtpAccount(smtpAccountRepository.findById(request.getSmtpAccountId())
                .orElseThrow(() -> new IllegalArgumentException("SMTP account not found")));
        campaign.setStatus(CampaignStatus.DRAFT);
        campaign.setAttachmentsJson(request.getAttachmentsJson());
        campaign.setCreatedBy(SecurityUtil.currentEmail());
        campaign.setCreatedAt(Instant.now());
        Campaign saved = campaignRepository.save(campaign);
        auditService.logAction("CAMPAIGN_CREATE", "campaign", saved.getId().toString(), null, saved, ip, userAgent);
        return toResponse(saved);
    }

    public CampaignResponse update(Long campaignId, CampaignUpdateRequest request, String ip, String userAgent) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
        if (campaign.getStatus() != CampaignStatus.DRAFT && campaign.getStatus() != CampaignStatus.COMPLETED) {
            throw new IllegalStateException("Campaign not editable");
        }
        if (campaign.getStatus() == CampaignStatus.COMPLETED) {
            campaign.setStatus(CampaignStatus.DRAFT);
            campaign.setScheduledAt(null);
            campaign.setSendWindowStart(null);
            campaign.setSendWindowEnd(null);
            campaign.setEmergencyBypass(false);
            campaign.setEmergencyReason(null);
        }
        validateCampaignSmtpSelection(request.getSmtpAccountId(), request.getSenderIdentityId());
        campaign.setTitle(request.getTitle());
        campaign.setSubject(request.getSubject());
        campaign.setHtmlBody(request.getHtmlBody());
        campaign.setTextBody(request.getTextBody());
        campaign.setCategory(request.getCategory());
        campaign.setSenderIdentity(senderIdentityRepository.findById(request.getSenderIdentityId())
                .orElseThrow(() -> new IllegalArgumentException("Sender identity not found")));
        campaign.setSmtpAccount(smtpAccountRepository.findById(request.getSmtpAccountId())
                .orElseThrow(() -> new IllegalArgumentException("SMTP account not found")));
        if (request.getAttachmentsJson() != null) {
            campaign.setAttachmentsJson(request.getAttachmentsJson());
        }
        campaign.setUpdatedAt(Instant.now());
        Campaign saved = campaignRepository.save(campaign);
        auditService.logAction("CAMPAIGN_UPDATE", "campaign", saved.getId().toString(), null, saved, ip, userAgent);
        return toResponse(saved);
    }

    @Transactional
    public CampaignResponse duplicate(Long campaignId, String ip, String userAgent) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
        Campaign copy = new Campaign();
        copy.setTitle(campaign.getTitle());
        copy.setSubject(campaign.getSubject());
        copy.setHtmlBody(campaign.getHtmlBody());
        copy.setTextBody(campaign.getTextBody());
        copy.setCategory(campaign.getCategory());
        copy.setSenderIdentity(campaign.getSenderIdentity());
        copy.setSmtpAccount(campaign.getSmtpAccount());
        copy.setStatus(CampaignStatus.DRAFT);
        copy.setAttachmentsJson(campaign.getAttachmentsJson());
        copy.setCreatedBy(SecurityUtil.currentEmail());
        copy.setCreatedAt(Instant.now());
        Campaign saved = campaignRepository.save(copy);
        List<Long> audienceIds = campaignAudienceRepository.findByCampaignId(campaignId).stream()
                .map(link -> link.getAudience().getId())
                .distinct()
                .toList();
        if (!audienceIds.isEmpty()) {
            saveAudienceLinks(saved, audienceIds);
        }
        auditService.logAction("CAMPAIGN_DUPLICATE", "campaign", saved.getId().toString(), null, saved, ip, userAgent);
        return toResponse(saved);
    }

    @Transactional
    public void requeue(Long campaignId, String ip, String userAgent) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
        campaignRecipientRepository.resetForCampaign(campaignId, RecipientStatus.QUEUED, Instant.now());
        campaign.setStatus(CampaignStatus.SENDING);
        campaign.setUpdatedAt(Instant.now());
        campaignRepository.save(campaign);
        auditService.logAction("CAMPAIGN_REQUEUE", "campaign", campaign.getId().toString(), null, campaign, ip, userAgent);
    }

    @Transactional
    public CampaignResponse submit(Long campaignId, CampaignSubmitRequest request, String ip, String userAgent) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
        if (campaign.getStatus() != CampaignStatus.DRAFT) {
            throw new IllegalStateException("Campaign not in draft");
        }
        campaign.setUpdatedAt(Instant.now());
        saveAudienceLinks(campaign, request.getAudienceIds());
        boolean emergency = campaign.getCategory() == CampaignCategory.EMERGENCY;
        if (emergency && SecurityUtil.currentRoles().contains(Role.SUPER_ADMIN.name())) {
            if (request.getEmergencyReason() == null || request.getEmergencyReason().isBlank()) {
                throw new IllegalArgumentException("Emergency reason required");
            }
            campaign.setEmergencyBypass(true);
            campaign.setEmergencyReason(request.getEmergencyReason());
            campaign.setStatus(CampaignStatus.APPROVED);
            auditService.logAction("EMERGENCY_BYPASS", "campaign", campaign.getId().toString(), null, campaign, ip, userAgent);
        } else {
            campaign.setStatus(CampaignStatus.PENDING_APPROVAL);
            createApprovalSteps(campaign);
        }
        campaignRepository.save(campaign);
        if (campaign.getStatus() == CampaignStatus.APPROVED && !request.getAudienceIds().isEmpty()) {
            ExpandRecipientsRequest expandRequest = new ExpandRecipientsRequest();
            expandRequest.setAudienceIds(request.getAudienceIds());
            expandRecipients(campaign.getId(), expandRequest, ip, userAgent);
        }
        auditService.logAction("CAMPAIGN_SUBMIT", "campaign", campaign.getId().toString(), null, campaign, ip, userAgent);
        return toResponse(campaign);
    }

    public CampaignResponse schedule(Long campaignId, CampaignScheduleRequest request, String ip, String userAgent) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
        if (campaign.getStatus() != CampaignStatus.APPROVED) {
            throw new IllegalStateException("Campaign not approved");
        }
        campaign.setScheduledAt(request.getScheduledAt());
        campaign.setSendWindowStart(request.getSendWindowStart());
        campaign.setSendWindowEnd(request.getSendWindowEnd());
        campaign.setStatus(CampaignStatus.SCHEDULED);
        campaign.setUpdatedAt(Instant.now());
        Campaign saved = campaignRepository.save(campaign);
        auditService.logAction("CAMPAIGN_SCHEDULE", "campaign", saved.getId().toString(), null, saved, ip, userAgent);
        return toResponse(saved);
    }

    @Transactional
    public int expandRecipients(Long campaignId, ExpandRecipientsRequest request, String ip, String userAgent) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
        if (campaign.getStatus() != CampaignStatus.APPROVED && campaign.getStatus() != CampaignStatus.SCHEDULED) {
            throw new IllegalStateException("Campaign not approved or scheduled");
        }
        campaignAudienceRepository.deleteByCampaignId(campaignId);
        campaignAudienceRepository.flush();
        campaignRecipientRepository.deleteByCampaignId(campaignId);
        Set<String> uniqueEmails = new HashSet<>();
        int total = 0;
        for (Long audienceId : request.getAudienceIds()) {
            Audience audience = audienceRepository.findById(audienceId)
                    .orElseThrow(() -> new IllegalArgumentException("Audience not found"));
            CampaignAudience link = new CampaignAudience();
            link.setCampaign(campaign);
            link.setAudience(audience);
            campaignAudienceRepository.save(link);
            List<AudienceRule> rules = audienceRuleRepository.findByAudienceId(audienceId);
            Specification<Employee> spec = audienceService.toSpecification(rules);
            List<Employee> employees = employeeRepository.findAll(spec);
            for (Employee employee : employees) {
                if (uniqueEmails.add(employee.getEmail())) {
                    CampaignRecipient recipient = new CampaignRecipient();
                    recipient.setCampaign(campaign);
                    recipient.setEmail(employee.getEmail());
                    recipient.setFullName(employee.getFullName());
                    recipient.setStatus(RecipientStatus.QUEUED);
                    recipient.setRetryCount(0);
                    recipient.setUpdatedAt(Instant.now());
                    campaignRecipientRepository.save(recipient);
                    total++;
                }
            }
        }
        if (campaign.getStatus() != CampaignStatus.SCHEDULED) {
            campaign.setStatus(CampaignStatus.SENDING);
        }
        campaign.setUpdatedAt(Instant.now());
        campaignRepository.save(campaign);
        auditService.logAction("CAMPAIGN_EXPAND", "campaign", campaign.getId().toString(), null, total, ip, userAgent);
        return total;
    }

    public void queueRecipients(Long campaignId, String ip, String userAgent) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
        campaign.setStatus(CampaignStatus.SENDING);
        campaign.setUpdatedAt(Instant.now());
        campaignRepository.save(campaign);
        auditService.logAction("CAMPAIGN_QUEUE", "campaign", campaign.getId().toString(), null, campaign, ip, userAgent);
    }

    @Transactional
    public void testSend(Long campaignId, TestSendRequest request, String ip, String userAgent,
                         SendingService sendingService) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
        if (campaign.getSmtpAccount() != null) {
            campaign.getSmtpAccount().getThrottlePerMinute();
        }
        int maxTestRecipients = policySettingsService.getEffectiveSettings().getMaxTestRecipients();
        if (request.getRecipients().size() > maxTestRecipients) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Too many test recipients");
        }
        List<String> allowedDomains = appProperties.getInternalDomains();
        for (String email : request.getRecipients()) {
            if (email == null || !email.contains("@")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid recipient email");
            }
            String domain = email.substring(email.indexOf('@') + 1).toLowerCase();
            if (allowedDomains != null && !allowedDomains.isEmpty()) {
                boolean allowAll = allowedDomains.stream().anyMatch(d -> "*".equals(d));
                if (!allowAll && allowedDomains.stream().noneMatch(d -> d.equalsIgnoreCase(domain))) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recipient outside internal domains");
                }
            }
        }
        List<String> failures = sendingService.sendTest(campaign, request.getRecipients());
        if (!failures.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, String.join("; ", failures));
        }
        auditService.logAction("CAMPAIGN_TEST_SEND", "campaign", campaign.getId().toString(), null, request, ip, userAgent);
    }

    private void createApprovalSteps(Campaign campaign) {
        var settings = policySettingsService.getEffectiveSettings();
        if (campaign.getCategory() == CampaignCategory.ORG_WIDE) {
            if ("APPROVER".equals(settings.getOrgWideRule())) {
                approvalService.createPending(campaign, Role.APPROVER);
            } else {
                approvalService.createPending(campaign, Role.HR_ADMIN);
                approvalService.createPending(campaign, Role.APPROVER);
            }
            return;
        }
        if (campaign.getCategory() == CampaignCategory.DEPARTMENTAL) {
            if ("APPROVER".equals(settings.getDepartmentRule())) {
                approvalService.createPending(campaign, Role.APPROVER);
            } else {
                approvalService.createPending(campaign, Role.DEPT_ADMIN);
            }
            return;
        }
        approvalService.createPending(campaign, Role.APPROVER);
    }

    private void validateCampaignSmtpSelection(Long smtpAccountId, Long senderIdentityId) {
        var settings = policySettingsService.getEffectiveSettings();
        Long notificationSmtpId = settings.getNotificationSmtpAccountId();
        Long notificationSenderId = settings.getNotificationSenderIdentityId();
        if (notificationSmtpId != null && notificationSmtpId != 0 && notificationSmtpId.equals(smtpAccountId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Notification SMTP account cannot be used for campaigns");
        }
        if (notificationSenderId != null && notificationSenderId != 0 && notificationSenderId.equals(senderIdentityId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Notification sender identity cannot be used for campaigns");
        }
    }

    @Transactional
    public void updateStatusIfApproved(Long campaignId, String ip, String userAgent) {
        if (approvalService.allApproved(campaignId)) {
            Campaign campaign = campaignRepository.findById(campaignId)
                    .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
            campaign.setStatus(CampaignStatus.APPROVED);
            campaign.setUpdatedAt(Instant.now());
            campaignRepository.save(campaign);
            List<Long> audienceIds = campaignAudienceRepository.findByCampaignId(campaignId).stream()
                    .map(link -> link.getAudience().getId())
                    .distinct()
                    .toList();
            if (!audienceIds.isEmpty()) {
                ExpandRecipientsRequest expandRequest = new ExpandRecipientsRequest();
                expandRequest.setAudienceIds(audienceIds);
                expandRecipients(campaignId, expandRequest, ip, userAgent);
            }
        }
    }

    public void reject(Long campaignId) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
        campaign.setStatus(CampaignStatus.REJECTED);
        campaign.setUpdatedAt(Instant.now());
        campaignRepository.save(campaign);
    }

    public void cancel(Long campaignId, String ip, String userAgent) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
        campaign.setStatus(CampaignStatus.CANCELLED);
        campaign.setUpdatedAt(Instant.now());
        campaignRepository.save(campaign);
        auditService.logAction("CAMPAIGN_CANCEL", "campaign", campaign.getId().toString(), null, campaign, ip, userAgent);
    }

    public void delete(Long campaignId, String ip, String userAgent) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
        if (campaign.getStatus() == CampaignStatus.SENDING) {
            throw new IllegalStateException("Cannot delete a sending campaign");
        }
        campaignAudienceRepository.deleteByCampaignId(campaignId);
        campaignRecipientRepository.deleteByCampaignId(campaignId);
        approvalRepository.deleteByCampaignId(campaignId);
        campaignRepository.deleteById(campaignId);
        auditService.logAction("CAMPAIGN_DELETE", "campaign", campaignId.toString(), null, campaign, ip, userAgent);
    }

    public CampaignResponse addAttachment(Long campaignId, MultipartFile file, String ip, String userAgent) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found"));
        if (campaign.getStatus() != CampaignStatus.DRAFT) {
            throw new IllegalStateException("Campaign not in draft");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File required");
        }
        try {
            Path targetDir = Path.of(attachmentsPath);
            Files.createDirectories(targetDir);
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "attachment";
            String safeName = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
            String id = UUID.randomUUID().toString();
            String storedName = id + "_" + safeName;
            Path target = targetDir.resolve(storedName);
            file.transferTo(target);

            List<CampaignAttachment> attachments = readAttachments(campaign.getAttachmentsJson());
            CampaignAttachment attachment = new CampaignAttachment();
            attachment.setId(id);
            attachment.setOriginalName(originalName);
            attachment.setStoredName(storedName);
            attachment.setSize(file.getSize());
            attachment.setContentType(file.getContentType());
            attachment.setUploadedAt(Instant.now());
            attachments.add(attachment);
            campaign.setAttachmentsJson(writeAttachments(attachments));
            campaign.setUpdatedAt(Instant.now());
            Campaign saved = campaignRepository.save(campaign);
            auditService.logAction("CAMPAIGN_ATTACHMENT_ADD", "campaign", campaignId.toString(), null, attachment, ip, userAgent);
            return toResponse(saved);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Attachment upload failed");
        }
    }

    public CampaignResponse get(Long id) {
        return toResponse(campaignRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Campaign not found")));
    }

    public List<CampaignResponse> list(CampaignStatus status) {
        if (status == null) {
            return campaignRepository.findAll().stream().map(this::toResponse).toList();
        }
        return campaignRepository.findByStatusIn(List.of(status)).stream().map(this::toResponse).toList();
    }

    private void saveAudienceLinks(Campaign campaign, List<Long> audienceIds) {
        campaignAudienceRepository.deleteByCampaignId(campaign.getId());
        List<CampaignAudience> links = new ArrayList<>();
        Set<Long> seen = new HashSet<>();
        for (Long audienceId : audienceIds) {
            if (!seen.add(audienceId)) {
                continue;
            }
            Audience audience = audienceRepository.findById(audienceId)
                    .orElseThrow(() -> new IllegalArgumentException("Audience not found"));
            CampaignAudience link = new CampaignAudience();
            link.setCampaign(campaign);
            link.setAudience(audience);
            links.add(link);
        }
        campaignAudienceRepository.saveAll(links);
    }

    private CampaignResponse toResponse(Campaign campaign) {
        CampaignResponse response = new CampaignResponse();
        response.setId(campaign.getId());
        response.setTitle(campaign.getTitle());
        response.setSubject(campaign.getSubject());
        response.setHtmlBody(campaign.getHtmlBody());
        response.setTextBody(campaign.getTextBody());
        response.setCategory(campaign.getCategory());
        response.setSenderIdentityId(campaign.getSenderIdentity() != null ? campaign.getSenderIdentity().getId() : null);
        response.setSmtpAccountId(campaign.getSmtpAccount() != null ? campaign.getSmtpAccount().getId() : null);
        response.setStatus(campaign.getStatus());
        response.setScheduledAt(campaign.getScheduledAt());
        response.setSendWindowStart(campaign.getSendWindowStart());
        response.setSendWindowEnd(campaign.getSendWindowEnd());
        response.setAttachmentsJson(campaign.getAttachmentsJson());
        response.setEmergencyBypass(campaign.isEmergencyBypass());
        response.setEmergencyReason(campaign.getEmergencyReason());
        response.setCreatedBy(campaign.getCreatedBy());
        response.setCreatedAt(campaign.getCreatedAt());
        response.setUpdatedAt(campaign.getUpdatedAt());
        return response;
    }

    private List<CampaignAttachment> readAttachments(String attachmentsJson) {
        if (attachmentsJson == null || attachmentsJson.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(attachmentsJson, new TypeReference<List<CampaignAttachment>>() {});
        } catch (IOException e) {
            return new ArrayList<>();
        }
    }

    private String writeAttachments(List<CampaignAttachment> attachments) {
        try {
            return objectMapper.writeValueAsString(attachments);
        } catch (IOException e) {
            return "[]";
        }
    }
}
