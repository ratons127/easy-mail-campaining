package com.example.bulkemail.service;

import com.example.bulkemail.dto.AudienceCreateRequest;
import com.example.bulkemail.entity.Audience;
import com.example.bulkemail.repo.AudienceRepository;
import com.example.bulkemail.repo.AudienceRuleRepository;
import com.example.bulkemail.repo.CampaignAudienceRepository;
import com.example.bulkemail.repo.EmployeeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AudienceServiceTest {
    @Mock
    private AudienceRepository audienceRepository;
    @Mock
    private AudienceRuleRepository audienceRuleRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private CampaignAudienceRepository campaignAudienceRepository;

    @Test
    void updateBlocksWhenLinkedToActiveCampaigns() {
        AudienceService service = new AudienceService(
                audienceRepository,
                audienceRuleRepository,
                employeeRepository,
                campaignAudienceRepository
        );
        Audience audience = new Audience();
        audience.setId(10L);
        when(campaignAudienceRepository.countByAudienceIdAndCampaignStatusIn(10L, anyList())).thenReturn(1L);
        when(audienceRepository.findById(10L)).thenReturn(Optional.of(audience));

        AudienceCreateRequest request = new AudienceCreateRequest();
        request.setName("Test");

        assertThrows(ResponseStatusException.class, () -> service.update(10L, request));
    }

    @Test
    void deleteBlocksWhenLinkedToActiveCampaigns() {
        AudienceService service = new AudienceService(
                audienceRepository,
                audienceRuleRepository,
                employeeRepository,
                campaignAudienceRepository
        );
        when(campaignAudienceRepository.countByAudienceIdAndCampaignStatusIn(11L, anyList())).thenReturn(1L);

        assertThrows(ResponseStatusException.class, () -> service.delete(11L));
    }
}
