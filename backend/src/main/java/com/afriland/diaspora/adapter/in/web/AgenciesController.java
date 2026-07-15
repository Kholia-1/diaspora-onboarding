package com.afriland.diaspora.adapter.in.web;

import com.afriland.diaspora.application.port.in.ManageReferentialsUseCase;
import com.afriland.diaspora.domain.model.Agency;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/agencies")
public class AgenciesController {

    private final ManageReferentialsUseCase referentials;

    public AgenciesController(ManageReferentialsUseCase referentials) {
        this.referentials = referentials;
    }

    @GetMapping
    public List<AgencyDto> listAgencies(@RequestParam(required = false) String q) {
        return referentials.listAgencies(q).stream().map(AgencyDto::from).toList();
    }

    @GetMapping("/active")
    public List<AgencyDto> listActiveAgencies(@RequestParam(required = false) String q) {
        return referentials.listActiveAgencies(q).stream().map(AgencyDto::from).toList();
    }

    @PostMapping
    public AgencyDto createAgency(@RequestBody AgencyCreateRequest payload) {
        return AgencyDto.from(referentials.createAgency(
                payload.code(),
                payload.name(),
                payload.city(),
                payload.countryId() == null && payload.country() == null ? "Cameroun" : payload.country(),
                payload.countryId(),
                payload.active()));
    }

    @PutMapping("/{agencyId}")
    public AgencyDto updateAgency(@PathVariable long agencyId, @RequestBody AgencyUpdateRequest payload) {
        return AgencyDto.from(referentials.updateAgency(
                agencyId, payload.code(), payload.name(), payload.city(), payload.country(), payload.countryId(),
                payload.active()));
    }

    @DeleteMapping("/{agencyId}")
    public DeleteResponse deleteAgency(@PathVariable long agencyId) {
        Agency agency = referentials.deleteAgency(agencyId);
        return new DeleteResponse("Agence désactivée avec succès.", agency.id());
    }

    public record AgencyCreateRequest(String code, String name, String city, String country,
                                      Long countryId, Boolean active) {
    }

    public record AgencyUpdateRequest(String code, String name, String city, String country,
                                      Long countryId, Boolean active) {
    }

    public record AgencyDto(long id, String code, String name, String city, String country,
                            Long countryId, boolean active) {

        static AgencyDto from(Agency agency) {
            return new AgencyDto(agency.id(), agency.code(), agency.name(), agency.city(), agency.country(),
                    agency.countryId(), agency.active());
        }
    }

    public record DeleteResponse(String message, @JsonProperty("agency_id") long agencyId) {
    }
}
