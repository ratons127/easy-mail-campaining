package com.example.bulkemail.service;

import com.example.bulkemail.audit.AuditService;
import com.example.bulkemail.config.AppProperties;
import com.example.bulkemail.dto.CampaignUpdateRequest;
import com.example.bulkemail.entity.*;
import com.example.bulkemail.repo.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CampaignServiceTest {
    @Mock
    private CampaignRepository campaignRepository;
    @Mock
    private SenderIdentityRepository senderIdentityRepository;
    @Mock
    private SmtpAccountRepository smtpAccountRepository;
    @Mock
    private CampaignAudienceRepository campaignAudienceRepository;
    @Mock
    private CampaignRecipientRepository campaignRecipientRepository;
    @Mock
    private AudienceRepository audienceRepository;
    @Mock
    private AudienceRuleRepository audienceRuleRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private AudienceService audienceService;
    @Mock
    private ApprovalService approvalService;
    @Mock
    private ApprovalRepository approvalRepository;
    @Mock
    private AppProperties appProperties;
    @Mock
    private AuditService auditService;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private PolicySettingsService policySettingsService;

    private CampaignService service() {
        return new CampaignService(
                campaignRepository,
                senderIdentityRepository,
                smtpAccountRepository,
                campaignAudienceRepository,
                campaignRecipientRepository,
                audienceRepository,
                audienceRuleRepository,
                employeeRepository,
                audienceService,
                approvalService,
                appProperties,
                auditService,
                approvalRepository,
                objectMapper,
                "/tmp",
                policySettingsService
        );
    }

    @Test
    void updateCompletedCampaignResetsToDraft() {
        PolicySettings settings = new PolicySettings();
        when(policySettingsService.getEffectiveSettings()).thenReturn(settings);

        Campaign campaign = new Campaign();
        campaign.setId(7L);
        campaign.setStatus(CampaignStatus.COMPLETED);
        campaign.setScheduledAt(Instant.now());
        campaign.setSendWindowStart(Instant.now());
        campaign.setSendWindowEnd(Instant.now());
        when(campaignRepository.findById(7L)).thenReturn(Optional.of(campaign));

        SenderIdentity senderIdentity = new SenderIdentity();
        senderIdentity.setId(3L);
        when(senderIdentityRepository.findById(3L)).thenReturn(Optional.of(senderIdentity));

        SmtpAccount smtpAccount = new SmtpAccount();
        smtpAccount.setId(2L);
        when(smtpAccountRepository.findById(2L)).thenReturn(Optional.of(smtpAccount));

        when(campaignRepository.save(any(Campaign.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CampaignUpdateRequest request = new CampaignUpdateRequest();
        request.setTitle("Updated");
        request.setSubject("Subject");
        request.setCategory(CampaignCategory.GENERAL);
        request.setSenderIdentityId(3L);
        request.setSmtpAccountId(2L);

        service().update(7L, request, "127.0.0.1", "test");

        ArgumentCaptor<Campaign> captor = ArgumentCaptor.forClass(Campaign.class);
        verify(campaignRepository).save(captor.capture());
        Campaign saved = captor.getValue();
        assertEquals(CampaignStatus.DRAFT, saved.getStatus());
        assertEquals(null, saved.getScheduledAt());
        assertEquals(null, saved.getSendWindowStart());
        assertEquals(null, saved.getSendWindowEnd());
    }

    @Test
    void requeueSetsRecipientsToQueuedAndCampaignSending() {
        Campaign campaign = new Campaign();
        campaign.setId(8L);
        campaign.setStatus(CampaignStatus.COMPLETED);
        when(campaignRepository.findById(8L)).thenReturn(Optional.of(campaign));

        service().requeue(8L, "127.0.0.1", "test");

        verify(campaignRecipientRepository).resetForCampaign(eq(8L), eq(RecipientStatus.QUEUED), any(Instant.class));
        ArgumentCaptor<Campaign> captor = ArgumentCaptor.forClass(Campaign.class);
        verify(campaignRepository).save(captor.capture());
        assertEquals(CampaignStatus.SENDING, captor.getValue().getStatus());
    }
}
