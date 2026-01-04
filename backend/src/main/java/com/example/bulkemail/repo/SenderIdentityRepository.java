package com.example.bulkemail.repo;

import com.example.bulkemail.entity.SenderIdentity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SenderIdentityRepository extends JpaRepository<SenderIdentity, Long> {
    long countBySmtpAccount_Id(Long smtpAccountId);
}
