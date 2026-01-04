package com.example.bulkemail.repo;

import com.example.bulkemail.entity.Campaign;
import com.example.bulkemail.entity.CampaignStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CampaignRepository extends JpaRepository<Campaign, Long> {
    List<Campaign> findByStatusIn(List<CampaignStatus> statuses);

    long countBySmtpAccount_Id(Long smtpAccountId);

    long countBySenderIdentity_Id(Long senderIdentityId);
}
