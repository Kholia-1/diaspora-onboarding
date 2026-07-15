package com.afriland.diaspora.adapter.in.web;

import com.afriland.diaspora.application.port.in.ManageReferentialsUseCase;
import com.afriland.diaspora.domain.model.Country;
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
@RequestMapping("/api/countries")
public class CountriesController {

    private final ManageReferentialsUseCase referentials;

    public CountriesController(ManageReferentialsUseCase referentials) {
        this.referentials = referentials;
    }

    @GetMapping
    public List<CountryDto> listCountries(@RequestParam(required = false) String q) {
        return referentials.listCountries(q).stream().map(CountryDto::from).toList();
    }

    @GetMapping("/active")
    public List<CountryDto> listActiveCountries(@RequestParam(required = false) String q) {
        return referentials.listActiveCountries(q).stream().map(CountryDto::from).toList();
    }

    @PostMapping
    public CountryDto createCountry(@RequestBody CountryCreateRequest payload) {
        return CountryDto.from(referentials.createCountry(
                payload.isoCode(),
                payload.flag(),
                payload.nameFr(),
                payload.callingCode(),
                payload.active(),
                payload.displayOrder() == null ? 1000 : payload.displayOrder()));
    }

    @PutMapping("/{countryId}")
    public CountryDto updateCountry(@PathVariable long countryId, @RequestBody CountryUpdateRequest payload) {
        return CountryDto.from(referentials.updateCountry(
                countryId,
                payload.isoCode(),
                payload.flag(),
                payload.nameFr(),
                payload.callingCode(),
                payload.active(),
                payload.displayOrder()));
    }

    @DeleteMapping("/{countryId}")
    public DeleteResponse deleteCountry(@PathVariable long countryId) {
        Country country = referentials.deleteCountry(countryId);
        return new DeleteResponse("Pays désactivé avec succès.", country.id());
    }

    // --- Agences d'un pays (relation 1..N) ---

    /** Agences (actives ou non) rattachées au pays — back-office. */
    @GetMapping("/{countryId}/agencies")
    public List<AgenciesController.AgencyDto> listCountryAgencies(@PathVariable long countryId) {
        return referentials.listAgenciesByCountry(countryId).stream()
                .map(AgenciesController.AgencyDto::from).toList();
    }

    /** Agences actives rattachées au pays — formulaire client (lecture publique). */
    @GetMapping("/{countryId}/agencies/active")
    public List<AgenciesController.AgencyDto> listActiveCountryAgencies(@PathVariable long countryId) {
        return referentials.listActiveAgenciesByCountry(countryId).stream()
                .map(AgenciesController.AgencyDto::from).toList();
    }

    /** Rattache une nouvelle agence au pays — back-office. */
    @PostMapping("/{countryId}/agencies")
    public AgenciesController.AgencyDto addCountryAgency(@PathVariable long countryId,
                                                        @RequestBody CountryAgencyRequest payload) {
        return AgenciesController.AgencyDto.from(referentials.addAgencyToCountry(
                countryId, payload.code(), payload.name(), payload.city(), payload.active()));
    }

    public record CountryAgencyRequest(String code, String name, String city, Boolean active) {
    }

    public record CountryCreateRequest(String isoCode, String flag, String nameFr, String callingCode,
                                       Boolean active, Integer displayOrder) {
    }

    public record CountryUpdateRequest(String isoCode, String flag, String nameFr, String callingCode,
                                       Boolean active, Integer displayOrder) {
    }

    public record CountryDto(long id, String isoCode, String flag, String nameFr, String callingCode,
                             boolean active, Integer displayOrder) {

        static CountryDto from(Country country) {
            return new CountryDto(country.id(), country.isoCode(), country.flag(), country.nameFr(),
                    country.callingCode(), country.active(), country.displayOrder());
        }
    }

    public record DeleteResponse(String message, @JsonProperty("country_id") long countryId) {
    }
}
