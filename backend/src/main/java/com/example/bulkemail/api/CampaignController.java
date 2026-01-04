package com.example.bulkemail.api;

import com.example.bulkemail.dto.*;
import com.example.bulkemail.entity.CampaignStatus;
import com.example.bulkemail.service.CampaignService;
import com.example.bulkemail.service.SendingService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/campaigns")
@Tag(name = "Campaigns")
public class CampaignController {
    private final CampaignService campaignService;
    private final SendingService sendingService;

    public CampaignController(CampaignService campaignService, SendingService sendingService) {
        this.campaignService = campaignService;
        this.sendingService = sendingService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','SENDER')")
    public CampaignResponse create(@Valid @RequestBody CampaignCreateRequest request, HttpServletRequest http) {
        return campaignService.create(request, ip(http), userAgent(http));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','SENDER')")
    public CampaignResponse update(@PathVariable Long id, @Valid @RequestBody CampaignUpdateRequest request,
                                   HttpServletRequest http) {
        return campaignService.update(id, request, ip(http), userAgent(http));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','SENDER','AUDITOR','APPROVER')")
    public List<CampaignResponse> list(@RequestParam(required = false) CampaignStatus status) {
        return campaignService.list(status);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','SENDER','AUDITOR','APPROVER')")
    public CampaignResponse get(@PathVariable Long id) {
        return campaignService.get(id);
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','SENDER')")
    public CampaignResponse submit(@PathVariable Long id, @Valid @RequestBody CampaignSubmitRequest request,
                                   HttpServletRequest http) {
        return campaignService.submit(id, request, ip(http), userAgent(http));
    }

    @PostMapping("/{id}/schedule")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','SENDER')")
    public CampaignResponse schedule(@PathVariable Long id, @Valid @RequestBody CampaignScheduleRequest request,
                                     HttpServletRequest http) {
        return campaignService.schedule(id, request, ip(http), userAgent(http));
    }

    @PostMapping("/{id}/expand")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','SENDER','APPROVER')")
    public String expand(@PathVariable Long id, @Valid @RequestBody ExpandRecipientsRequest request,
                         HttpServletRequest http) {
        int total = campaignService.expandRecipients(id, request, ip(http), userAgent(http));
        return "Expanded " + total + " recipients";
    }

    @PostMapping("/{id}/queue")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','SENDER','APPROVER')")
    public String queue(@PathVariable Long id, HttpServletRequest http) {
        campaignService.queueRecipients(id, ip(http), userAgent(http));
        return "Queued";
    }

    @PostMapping("/{id}/requeue")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','SENDER','APPROVER')")
    public String requeue(@PathVariable Long id, HttpServletRequest http) {
        campaignService.requeue(id, ip(http), userAgent(http));
        return "Requeued";
    }

    @PostMapping("/{id}/test-send")
    @PreAuthorize("isAuthenticated()")
    public String testSend(@PathVariable Long id, @Valid @RequestBody TestSendRequest request,
                           HttpServletRequest http) {
        campaignService.testSend(id, request, ip(http), userAgent(http), sendingService);
        return "Test sent";
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','SENDER')")
    public String cancel(@PathVariable Long id, HttpServletRequest http) {
        campaignService.cancel(id, ip(http), userAgent(http));
        return "Cancelled";
    }

    @PostMapping("/{id}/duplicate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','SENDER')")
    public CampaignResponse duplicate(@PathVariable Long id, HttpServletRequest http) {
        return campaignService.duplicate(id, ip(http), userAgent(http));
    }

    @PostMapping(value = "/{id}/attachments", consumes = {"multipart/form-data"})
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','SENDER')")
    public CampaignResponse uploadAttachment(@PathVariable Long id, @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
                                             HttpServletRequest http) {
        return campaignService.addAttachment(id, file, ip(http), userAgent(http));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','HR_ADMIN','DEPT_ADMIN','SENDER')")
    public void delete(@PathVariable Long id, HttpServletRequest http) {
        campaignService.delete(id, ip(http), userAgent(http));
    }

    private String ip(HttpServletRequest request) {
        return request.getRemoteAddr();
    }

    private String userAgent(HttpServletRequest request) {
        return request.getHeader("User-Agent");
    }
}
