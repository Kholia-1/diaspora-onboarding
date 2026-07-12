package com.afriland.diaspora.adapter.in.web;

import com.afriland.diaspora.application.port.in.ManageReferentialsUseCase;
import com.afriland.diaspora.domain.model.Nationality;
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
@RequestMapping("/api/nationalities")
public class NationalitiesController {

    private final ManageReferentialsUseCase referentials;

    public NationalitiesController(ManageReferentialsUseCase referentials) {
        this.referentials = referentials;
    }

    @GetMapping
    public List<NationalityDto> listNationalities(@RequestParam(required = false) String q) {
        return referentials.listNationalities(q).stream().map(NationalityDto::from).toList();
    }

    @GetMapping("/active")
    public List<NationalityDto> listActiveNationalities(@RequestParam(required = false) String q) {
        return referentials.listActiveNationalities(q).stream().map(NationalityDto::from).toList();
    }

    @PostMapping
    public NationalityDto createNationality(@RequestBody NationalityCreateRequest payload) {
        return NationalityDto.from(referentials.createNationality(
                payload.code(), payload.label(), payload.active()));
    }

    @PutMapping("/{nationalityId}")
    public NationalityDto updateNationality(@PathVariable long nationalityId,
                                            @RequestBody NationalityUpdateRequest payload) {
        return NationalityDto.from(referentials.updateNationality(
                nationalityId, payload.code(), payload.label(), payload.active()));
    }

    @DeleteMapping("/{nationalityId}")
    public DeleteResponse deleteNationality(@PathVariable long nationalityId) {
        Nationality nationality = referentials.deleteNationality(nationalityId);
        return new DeleteResponse("Nationalité désactivée avec succès.", nationality.id());
    }

    public record NationalityCreateRequest(String code, String label, Boolean active) {
    }

    public record NationalityUpdateRequest(String code, String label, Boolean active) {
    }

    public record NationalityDto(long id, String code, String label, boolean active) {

        static NationalityDto from(Nationality nationality) {
            return new NationalityDto(nationality.id(), nationality.code(), nationality.label(),
                    nationality.active());
        }
    }

    public record DeleteResponse(String message, @JsonProperty("nationality_id") long nationalityId) {
    }
}
