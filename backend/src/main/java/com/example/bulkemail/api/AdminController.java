package com.example.bulkemail.api;

import com.example.bulkemail.dto.SenderIdentityRequest;
import com.example.bulkemail.dto.SenderIdentityResponse;
import com.example.bulkemail.dto.PolicySettingsRequest;
import com.example.bulkemail.dto.PolicySettingsResponse;
import com.example.bulkemail.entity.SenderIdentity;
import com.example.bulkemail.entity.SmtpAccount;
import com.example.bulkemail.repo.CampaignRepository;
import com.example.bulkemail.repo.SenderIdentityRepository;
import com.example.bulkemail.repo.SmtpAccountRepository;
import com.example.bulkemail.service.PolicySettingsService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin")
public class AdminController {
    private final SmtpAccountRepository smtpAccountRepository;
    private final SenderIdentityRepository senderIdentityRepository;
    private final PolicySettingsService policySettingsService;
    private final CampaignRepository campaignRepository;

    public AdminController(SmtpAccountRepository smtpAccountRepository, SenderIdentityRepository senderIdentityRepository,
                           PolicySettingsService policySettingsService,
                           CampaignRepository campaignRepository) {
        this.smtpAccountRepository = smtpAccountRepository;
        this.senderIdentityRepository = senderIdentityRepository;
        this.policySettingsService = policySettingsService;
        this.campaignRepository = campaignRepository;
    }

    @PostMapping("/smtp-accounts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN')")
    public SmtpAccount createSmtpAccount(@RequestBody SmtpAccount smtpAccount) {
        return smtpAccountRepository.save(smtpAccount);
    }

    @PutMapping("/smtp-accounts/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN')")
    public SmtpAccount updateSmtpAccount(@PathVariable Long id, @RequestBody SmtpAccount smtpAccount) {
        smtpAccount.setId(id);
        return smtpAccountRepository.save(smtpAccount);
    }

    @DeleteMapping("/smtp-accounts/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN')")
    public void deleteSmtpAccount(@PathVariable Long id) {
        var settings = policySettingsService.getEffectiveSettings();
        if (settings.getNotificationSmtpAccountId() != null && settings.getNotificationSmtpAccountId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "SMTP account used for notifications");
        }
        if (senderIdentityRepository.countBySmtpAccount_Id(id) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "SMTP account has sender identities");
        }
        if (campaignRepository.countBySmtpAccount_Id(id) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "SMTP account used by campaigns");
        }
        smtpAccountRepository.deleteById(id);
    }

    @GetMapping("/smtp-accounts")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','AUDITOR','SENDER','APPROVER')")
    public List<SmtpAccount> listSmtpAccounts() {
        return smtpAccountRepository.findAll();
    }

    @PostMapping("/sender-identities")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN')")
    public SenderIdentityResponse createSenderIdentity(@Valid @RequestBody SenderIdentityRequest request) {
        SenderIdentity senderIdentity = new SenderIdentity();
        senderIdentity.setDisplayName(request.getDisplayName());
        senderIdentity.setEmail(request.getEmail());
        senderIdentity.setSmtpAccount(resolveSmtpAccount(request.getSmtpAccountId()));
        return toResponse(senderIdentityRepository.save(senderIdentity));
    }

    @PutMapping("/sender-identities/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN')")
    public SenderIdentityResponse updateSenderIdentity(@PathVariable Long id, @Valid @RequestBody SenderIdentityRequest request) {
        SenderIdentity senderIdentity = senderIdentityRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sender identity not found"));
        senderIdentity.setDisplayName(request.getDisplayName());
        senderIdentity.setEmail(request.getEmail());
        senderIdentity.setSmtpAccount(resolveSmtpAccount(request.getSmtpAccountId()));
        return toResponse(senderIdentityRepository.save(senderIdentity));
    }

    @DeleteMapping("/sender-identities/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN')")
    public void deleteSenderIdentity(@PathVariable Long id) {
        var settings = policySettingsService.getEffectiveSettings();
        if (settings.getNotificationSenderIdentityId() != null && settings.getNotificationSenderIdentityId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sender identity used for notifications");
        }
        if (campaignRepository.countBySenderIdentity_Id(id) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sender identity used by campaigns");
        }
        senderIdentityRepository.deleteById(id);
    }

    @GetMapping("/sender-identities")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','AUDITOR','SENDER','APPROVER')")
    public List<SenderIdentityResponse> listSenderIdentities() {
        return senderIdentityRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/policies")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN')")
    public PolicySettingsResponse getPolicies() {
        return policySettingsService.getSettings();
    }

    @PutMapping("/policies")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN')")
    public PolicySettingsResponse updatePolicies(@Valid @RequestBody PolicySettingsRequest request) {
        return policySettingsService.updateSettings(request);
    }

    private SenderIdentityResponse toResponse(SenderIdentity senderIdentity) {
        SenderIdentityResponse response = new SenderIdentityResponse();
        response.setId(senderIdentity.getId());
        response.setDisplayName(senderIdentity.getDisplayName());
        response.setEmail(senderIdentity.getEmail());
        if (senderIdentity.getSmtpAccount() != null) {
            response.setSmtpAccountId(senderIdentity.getSmtpAccount().getId());
        }
        return response;
    }

    private SmtpAccount resolveSmtpAccount(Long smtpAccountId) {
        if (smtpAccountId == null || smtpAccountId == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SMTP account required");
        }
        return smtpAccountRepository.findById(smtpAccountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "SMTP account not found"));
    }
}
