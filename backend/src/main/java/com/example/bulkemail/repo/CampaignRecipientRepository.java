package com.example.bulkemail.repo;

import com.example.bulkemail.entity.CampaignRecipient;
import com.example.bulkemail.entity.RecipientStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;

import java.util.List;
import java.time.Instant;

public interface CampaignRecipientRepository extends JpaRepository<CampaignRecipient, Long> {
    @Query("select cr from CampaignRecipient cr where cr.status = ?1 and cr.campaign.status in ?2")
    List<CampaignRecipient> findByStatusAndCampaignStatuses(RecipientStatus status, List<com.example.bulkemail.entity.CampaignStatus> statuses, Pageable pageable);

    long countByCampaignIdAndStatus(Long campaignId, RecipientStatus status);

    void deleteByCampaignId(Long campaignId);

    List<CampaignRecipient> findByCampaignId(Long campaignId);

    List<CampaignRecipient> findByCampaignIdOrderByUpdatedAtDesc(Long campaignId);

    @Modifying
    @Query("update CampaignRecipient cr set cr.status = :status, cr.retryCount = 0, cr.lastError = null, cr.updatedAt = :updatedAt where cr.campaign.id = :campaignId")
    int resetForCampaign(Long campaignId, RecipientStatus status, Instant updatedAt);
}
