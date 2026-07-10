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
    public Agency createAgency(String code, String name, String city, String country, Boolean active) {
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
                country == null ? "Cameroun" : country,
                active == null || active,
                utcNow(),
                null));
    }

    @Override
    public Agency updateAgency(long agencyId, String code, String name, String city, String country, Boolean active) {
        Agency agency = agencies.findById(agencyId)
                .orElseThrow(() -> ApiException.notFound("Agence introuvable."));

        Agency updated = new Agency(
                agency.id(),
                code != null ? code.toUpperCase(Locale.ROOT).strip() : agency.code(),
                name != null ? name.strip() : agency.name(),
                city != null ? city : agency.city(),
                country != null ? country : agency.country(),
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
                false, agency.createdAt(), utcNow()));
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
