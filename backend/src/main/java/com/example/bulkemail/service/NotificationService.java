package com.example.bulkemail.service;

import com.example.bulkemail.entity.SenderIdentity;
import com.example.bulkemail.entity.SmtpAccount;
import com.example.bulkemail.repo.SenderIdentityRepository;
import com.example.bulkemail.repo.SmtpAccountRepository;
import jakarta.mail.Message;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Properties;

@Service
public class NotificationService {
    private final SmtpAccountRepository smtpAccountRepository;
    private final SenderIdentityRepository senderIdentityRepository;
    private final PolicySettingsService policySettingsService;
    private final Long envSmtpAccountId;
    private final Long envSenderIdentityId;

    public NotificationService(SmtpAccountRepository smtpAccountRepository,
                               SenderIdentityRepository senderIdentityRepository,
                               PolicySettingsService policySettingsService,
                               @Value("${app.notification.smtp-account-id:0}") Long envSmtpAccountId,
                               @Value("${app.notification.sender-identity-id:0}") Long envSenderIdentityId) {
        this.smtpAccountRepository = smtpAccountRepository;
        this.senderIdentityRepository = senderIdentityRepository;
        this.policySettingsService = policySettingsService;
        this.envSmtpAccountId = envSmtpAccountId;
        this.envSenderIdentityId = envSenderIdentityId;
    }

    public void sendLoginNotice(String toEmail) {
        sendMessage(toEmail, "Login notification", "A login to the Bulk Email platform was detected for your account.");
    }

    public void sendPasswordReset(String toEmail, String link) {
        sendMessage(toEmail, "Reset your password", "Reset your password using this link: " + link);
    }

    private void sendMessage(String toEmail, String subject, String body) {
        var settings = policySettingsService.getEffectiveSettings();
        Long smtpAccountId = resolveSmtpAccountId(settings.getNotificationSmtpAccountId());
        Long senderIdentityId = resolveSenderIdentityId(settings.getNotificationSenderIdentityId());
        if (smtpAccountId == null || smtpAccountId == 0 || senderIdentityId == null || senderIdentityId == 0) {
            throw new IllegalStateException("Notification SMTP settings are not configured");
        }
        SmtpAccount account = smtpAccountRepository.findById(smtpAccountId)
                .orElseThrow(() -> new IllegalArgumentException("SMTP account not configured"));
        SenderIdentity senderIdentity = senderIdentityRepository.findById(senderIdentityId)
                .orElseThrow(() -> new IllegalArgumentException("Sender identity not configured"));

        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(account.getHost());
        mailSender.setPort(account.getPort());
        mailSender.setUsername(account.getUsername());
        mailSender.setPassword(account.getPassword());
        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        boolean hasAuth = account.getUsername() != null && !account.getUsername().isBlank();
        boolean useSsl = account.getPort() != null && account.getPort() == 465;
        boolean useTls = account.isUseTls() && !useSsl;
        props.put("mail.smtp.auth", String.valueOf(hasAuth));
        props.put("mail.smtp.starttls.enable", String.valueOf(useTls));
        props.put("mail.smtp.starttls.required", String.valueOf(useTls));
        props.put("mail.smtp.ssl.enable", String.valueOf(useSsl));
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "5000");

        try {
            MimeMessage message = mailSender.createMimeMessage();
            String senderEmail = senderIdentity.getEmail();
            String smtpUsername = account.getUsername();
            String fromEmail = senderEmail;
            if (smtpUsername != null && smtpUsername.contains("@") && !smtpUsername.equalsIgnoreCase(senderEmail)) {
                fromEmail = smtpUsername;
            }
            message.setFrom(new InternetAddress(fromEmail, senderIdentity.getDisplayName(), StandardCharsets.UTF_8.name()));
            if (senderEmail != null && !senderEmail.isBlank() && !senderEmail.equalsIgnoreCase(fromEmail)) {
                message.setReplyTo(new InternetAddress[]{new InternetAddress(senderEmail, senderIdentity.getDisplayName(), StandardCharsets.UTF_8.name())});
            }
            message.setRecipient(Message.RecipientType.TO, new InternetAddress(toEmail));
            message.setSubject(subject, StandardCharsets.UTF_8.name());
            message.setText(body, StandardCharsets.UTF_8.name());
            mailSender.send(message);
        } catch (Exception e) {
            throw new IllegalStateException("SMTP send failed: " + e.getMessage(), e);
        }
    }

    private Long resolveSmtpAccountId(Long policyValue) {
        return policyValue != null && policyValue != 0 ? policyValue : envSmtpAccountId;
    }

    private Long resolveSenderIdentityId(Long policyValue) {
        return policyValue != null && policyValue != 0 ? policyValue : envSenderIdentityId;
    }
}
