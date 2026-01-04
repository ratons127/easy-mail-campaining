package com.example.bulkemail.service;

import com.example.bulkemail.dto.*;
import com.example.bulkemail.entity.*;
import com.example.bulkemail.repo.AudienceRepository;
import com.example.bulkemail.repo.AudienceRuleRepository;
import com.example.bulkemail.repo.EmployeeRepository;
import com.example.bulkemail.security.SecurityUtil;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;

@Service
public class AudienceService {
    private final AudienceRepository audienceRepository;
    private final AudienceRuleRepository audienceRuleRepository;
    private final EmployeeRepository employeeRepository;
    private final com.example.bulkemail.repo.CampaignAudienceRepository campaignAudienceRepository;

    public AudienceService(AudienceRepository audienceRepository, AudienceRuleRepository audienceRuleRepository,
                           EmployeeRepository employeeRepository,
                           com.example.bulkemail.repo.CampaignAudienceRepository campaignAudienceRepository) {
        this.audienceRepository = audienceRepository;
        this.audienceRuleRepository = audienceRuleRepository;
        this.employeeRepository = employeeRepository;
        this.campaignAudienceRepository = campaignAudienceRepository;
    }

    public AudienceResponse create(AudienceCreateRequest request) {
        Audience audience = new Audience();
        audience.setName(request.getName());
        audience.setDescription(request.getDescription());
        audience.setCreatedBy(SecurityUtil.currentEmail());
        audience.setCreatedAt(Instant.now());
        Audience saved = audienceRepository.save(audience);
        List<AudienceRuleDto> rules = saveRules(saved, request.getRules());
        AudienceResponse response = toResponse(saved);
        response.setRules(rules);
        return response;
    }

    public AudienceResponse update(Long audienceId, AudienceCreateRequest request) {
        ensureNotLinkedToActiveCampaigns(audienceId);
        Audience audience = audienceRepository.findById(audienceId)
                .orElseThrow(() -> new IllegalArgumentException("Audience not found"));
        audience.setName(request.getName());
        audience.setDescription(request.getDescription());
        Audience saved = audienceRepository.save(audience);
        audienceRuleRepository.deleteByAudienceId(audienceId);
        List<AudienceRuleDto> rules = saveRules(saved, request.getRules());
        AudienceResponse response = toResponse(saved);
        response.setRules(rules);
        return response;
    }

    public void delete(Long audienceId) {
        ensureNotLinkedToActiveCampaigns(audienceId);
        campaignAudienceRepository.deleteByAudienceId(audienceId);
        audienceRuleRepository.deleteByAudienceId(audienceId);
        audienceRepository.deleteById(audienceId);
    }

    public List<AudienceResponse> list() {
        return audienceRepository.findAll().stream().map(audience -> {
            AudienceResponse response = toResponse(audience);
            response.setRules(audienceRuleRepository.findByAudienceId(audience.getId()).stream()
                    .map(this::toRuleDto).toList());
            return response;
        }).toList();
    }

    public AudiencePreviewResponse preview(Long audienceId) {
        Audience audience = audienceRepository.findById(audienceId)
                .orElseThrow(() -> new IllegalArgumentException("Audience not found"));
        List<AudienceRule> rules = audienceRuleRepository.findByAudienceId(audience.getId());
        Specification<Employee> spec = toSpecification(rules);
        long count = employeeRepository.count(spec);
        List<EmployeeDto> sample = employeeRepository
                .findAll(spec, org.springframework.data.domain.PageRequest.of(0, 10))
                .stream().map(this::toEmployeeDto).toList();
        AudiencePreviewResponse response = new AudiencePreviewResponse();
        response.setCount(count);
        response.setSample(sample);
        return response;
    }

    public Specification<Employee> toSpecification(List<AudienceRule> rules) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            for (AudienceRule rule : rules) {
                if (rule.getRuleType() == AudienceRuleType.DEPARTMENT) {
                    Join<Employee, Department> dept = root.join("department");
                    predicates.add(cb.equal(cb.lower(dept.get("name")), rule.getRuleValue().toLowerCase()));
                } else if (rule.getRuleType() == AudienceRuleType.LOCATION) {
                    Join<Employee, Location> loc = root.join("location");
                    predicates.add(cb.equal(cb.lower(loc.get("name")), rule.getRuleValue().toLowerCase()));
                } else if (rule.getRuleType() == AudienceRuleType.TITLE_CONTAINS) {
                    predicates.add(cb.like(cb.lower(root.get("title")), "%" + rule.getRuleValue().toLowerCase() + "%"));
                } else if (rule.getRuleType() == AudienceRuleType.STATUS) {
                    predicates.add(cb.equal(root.get("status"), EmployeeStatus.valueOf(rule.getRuleValue().toUpperCase())));
                }
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private List<AudienceRuleDto> saveRules(Audience audience, List<AudienceRuleDto> ruleDtos) {
        List<AudienceRuleDto> saved = new ArrayList<>();
        for (AudienceRuleDto dto : ruleDtos) {
            AudienceRule rule = new AudienceRule();
            rule.setAudience(audience);
            rule.setRuleType(dto.getRuleType());
            rule.setRuleValue(dto.getRuleValue());
            audienceRuleRepository.save(rule);
            saved.add(dto);
        }
        return saved;
    }

    private AudienceResponse toResponse(Audience audience) {
        AudienceResponse response = new AudienceResponse();
        response.setId(audience.getId());
        response.setName(audience.getName());
        response.setDescription(audience.getDescription());
        response.setCreatedBy(audience.getCreatedBy());
        response.setCreatedAt(audience.getCreatedAt());
        return response;
    }

    private AudienceRuleDto toRuleDto(AudienceRule rule) {
        AudienceRuleDto dto = new AudienceRuleDto();
        dto.setRuleType(rule.getRuleType());
        dto.setRuleValue(rule.getRuleValue());
        return dto;
    }

    private EmployeeDto toEmployeeDto(Employee employee) {
        EmployeeDto dto = new EmployeeDto();
        dto.setId(employee.getId());
        dto.setEmail(employee.getEmail());
        dto.setFullName(employee.getFullName());
        dto.setTitle(employee.getTitle());
        dto.setStatus(employee.getStatus());
        dto.setDepartmentId(employee.getDepartment() != null ? employee.getDepartment().getId() : null);
        dto.setLocationId(employee.getLocation() != null ? employee.getLocation().getId() : null);
        return dto;
    }

    private void ensureNotLinkedToActiveCampaigns(Long audienceId) {
        List<CampaignStatus> activeStatuses = new ArrayList<>(EnumSet.of(
                CampaignStatus.DRAFT,
                CampaignStatus.PENDING_APPROVAL,
                CampaignStatus.APPROVED,
                CampaignStatus.SCHEDULED,
                CampaignStatus.SENDING
        ));
        if (campaignAudienceRepository.countByAudienceIdAndCampaignStatusIn(audienceId, activeStatuses) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Audience linked to active campaigns");
        }
    }
}
