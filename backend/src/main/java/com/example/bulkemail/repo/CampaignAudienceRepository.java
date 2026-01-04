package com.example.bulkemail.repo;

import com.example.bulkemail.entity.CampaignAudience;
import com.example.bulkemail.entity.CampaignStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CampaignAudienceRepository extends JpaRepository<CampaignAudience, Long> {
    List<CampaignAudience> findByCampaignId(Long campaignId);
    void deleteByCampaignId(Long campaignId);
    void deleteByAudienceId(Long audienceId);

    @Query("select count(ca) from CampaignAudience ca join ca.campaign c where ca.audience.id = ?1 and c.status in ?2")
    long countByAudienceIdAndCampaignStatusIn(Long audienceId, List<CampaignStatus> statuses);
}
