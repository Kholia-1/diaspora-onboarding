package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.ManageReferentialsUseCase;
import com.afriland.diaspora.application.port.out.AgencyRepositoryPort;
import com.afriland.diaspora.application.port.out.CountryRepositoryPort;
import com.afriland.diaspora.application.port.out.NationalityRepositoryPort;
import com.afriland.diaspora.domain.model.Agency;
import com.afriland.diaspora.domain.model.Country;
import com.afriland.diaspora.domain.model.Nationality;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class ReferentialService implements ManageReferentialsUseCase {

    private final AgencyRepositoryPort agencies;
    private final NationalityRepositoryPort nationalities;
    private final CountryRepositoryPort countries;

    public ReferentialService(AgencyRepositoryPort agencies, NationalityRepositoryPort nationalities,
                              CountryRepositoryPort countries) {
        this.agencies = agencies;
        this.nationalities = nationalities;
        this.countries = countries;
    }

    // --- Agences ---

    @Override
    @Transactional(readOnly = true)
    public List<Agency> listAgencies(String q) {
        return agencies.search(q);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Agency> listActiveAgencies(String q) {
        return agencies.searchActive(q);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Agency> listAgenciesByCountry(long countryId) {
        return agencies.searchByCountry(countryId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Agency> listActiveAgenciesByCountry(long countryId) {
        return agencies.searchActiveByCountry(countryId);
    }

    @Override
    public Agency createAgency(String code, String name, String city, String country, Long countryId, Boolean active) {
        String rawCode = code == null ? "" : code;
        String rawName = name == null ? "" : name;

        if (agencies.existsByCode(rawCode)) {
            throw ApiException.badRequest("Ce code agence existe déjà.");
        }
        if (agencies.existsByName(rawName)) {
            throw ApiException.badRequest("Cette agence existe déjà.");
        }

        return agencies.save(new Agency(
                null,
                rawCode.toUpperCase(Locale.ROOT).strip(),
                rawName.strip(),
                city,
                resolveCountryLabel(countryId, country),
                countryId,
                active == null || active,
                utcNow(),
                null));
    }

    @Override
    public Agency addAgencyToCountry(long countryId, String code, String name, String city, Boolean active) {
        // Valide le pays (via resolveCountryLabel) et crée l'agence rattachée ;
        // le libellé pays est repris de name_fr du pays.
        return createAgency(code, name, city, null, countryId, active);
    }

    @Override
    public Agency updateAgency(long agencyId, String code, String name, String city, String country, Long countryId,
                               Boolean active) {
        Agency agency = agencies.findById(agencyId)
                .orElseThrow(() -> ApiException.notFound("Agence introuvable."));

        Long newCountryId = countryId != null ? countryId : agency.countryId();
        // Si le rattachement change, le libellé pays suit name_fr du nouveau pays ;
        // sinon on garde le texte fourni (ou l'existant).
        String newCountry = countryId != null
                ? resolveCountryLabel(countryId, agency.country())
                : (country != null ? country : agency.country());

        Agency updated = new Agency(
                agency.id(),
                code != null ? code.toUpperCase(Locale.ROOT).strip() : agency.code(),
                name != null ? name.strip() : agency.name(),
                city != null ? city : agency.city(),
                newCountry,
                newCountryId,
                active != null ? active : agency.active(),
                agency.createdAt(),
                utcNow());

        return agencies.save(updated);
    }

    @Override
    public Agency deleteAgency(long agencyId) {
        Agency agency = agencies.findById(agencyId)
                .orElseThrow(() -> ApiException.notFound("Agence introuvable."));

        return agencies.save(new Agency(
                agency.id(), agency.code(), agency.name(), agency.city(), agency.country(),
                agency.countryId(), false, agency.createdAt(), utcNow()));
    }

    /**
     * Libellé pays cohérent avec name_fr quand un countryId est fourni (source de
     * vérité, existence validée), sinon le texte libre passé (défaut « Cameroun »).
     */
    private String resolveCountryLabel(Long countryId, String fallback) {
        if (countryId != null) {
            return countries.findById(countryId)
                    .orElseThrow(() -> ApiException.badRequest("Pays introuvable."))
                    .nameFr();
        }
        return fallback == null ? "Cameroun" : fallback;
    }

    // --- Nationalités ---

    @Override
    @Transactional(readOnly = true)
    public List<Nationality> listNationalities(String q) {
        return nationalities.search(q);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Nationality> listActiveNationalities(String q) {
        return nationalities.searchActive(q);
    }

    @Override
    public Nationality createNationality(String code, String label, Boolean active) {
        String cleanCode = (code == null ? "" : code).toUpperCase(Locale.ROOT).strip();
        String cleanLabel = (label == null ? "" : label).strip();

        if (nationalities.existsByCode(cleanCode)) {
            throw ApiException.badRequest("Ce code existe déjà.");
        }
        if (nationalities.existsByLabel(cleanLabel)) {
            throw ApiException.badRequest("Cette nationalité existe déjà.");
        }

        return nationalities.save(new Nationality(
                null, cleanCode, cleanLabel, active == null || active, utcNow(), null));
    }

    @Override
    public Nationality updateNationality(long nationalityId, String code, String label, Boolean active) {
        Nationality nationality = nationalities.findById(nationalityId)
                .orElseThrow(() -> ApiException.notFound("Nationalité introuvable."));

        return nationalities.save(new Nationality(
                nationality.id(),
                code != null ? code.toUpperCase(Locale.ROOT).strip() : nationality.code(),
                label != null ? label.strip() : nationality.label(),
                active != null ? active : nationality.active(),
                nationality.createdAt(),
                utcNow()));
    }

    @Override
    public Nationality deleteNationality(long nationalityId) {
        Nationality nationality = nationalities.findById(nationalityId)
                .orElseThrow(() -> ApiException.notFound("Nationalité introuvable."));

        return nationalities.save(new Nationality(
                nationality.id(), nationality.code(), nationality.label(),
                false, nationality.createdAt(), utcNow()));
    }

    // --- Pays ---

    @Override
    @Transactional(readOnly = true)
    public List<Country> listCountries(String q) {
        return countries.search(q);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Country> listActiveCountries(String q) {
        return countries.searchActive(q);
    }

    @Override
    public Country createCountry(String isoCode, String flag, String nameFr, String callingCode,
                                 Boolean active, Integer displayOrder) {
        String cleanIso = (isoCode == null ? "" : isoCode).toUpperCase(Locale.ROOT).strip();

        if (countries.existsByIsoCode(cleanIso)) {
            throw ApiException.badRequest("Ce pays existe déjà.");
        }

        return countries.save(new Country(
                null,
                cleanIso,
                flag,
                (nameFr == null ? "" : nameFr).strip(),
                (callingCode == null ? "" : callingCode).strip(),
                active == null || active,
                displayOrder == null ? 1000 : displayOrder,
                utcNow(),
                null));
    }

    @Override
    public Country updateCountry(long countryId, String isoCode, String flag, String nameFr, String callingCode,
                                 Boolean active, Integer displayOrder) {
        Country country = countries.findById(countryId)
                .orElseThrow(() -> ApiException.notFound("Pays introuvable."));

        return countries.save(new Country(
                country.id(),
                isoCode != null ? isoCode.toUpperCase(Locale.ROOT).strip() : country.isoCode(),
                flag != null ? flag : country.flag(),
                nameFr != null ? nameFr.strip() : country.nameFr(),
                callingCode != null ? callingCode.strip() : country.callingCode(),
                active != null ? active : country.active(),
                displayOrder != null ? displayOrder : country.displayOrder(),
                country.createdAt(),
                utcNow()));
    }

    @Override
    public Country deleteCountry(long countryId) {
        Country country = countries.findById(countryId)
                .orElseThrow(() -> ApiException.notFound("Pays introuvable."));

        return countries.save(new Country(
                country.id(), country.isoCode(), country.flag(), country.nameFr(), country.callingCode(),
                false, country.displayOrder(), country.createdAt(), utcNow()));
    }

    private static LocalDateTime utcNow() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }
}
