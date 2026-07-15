package com.afriland.diaspora.application.port.in;

import com.afriland.diaspora.domain.model.Agency;
import com.afriland.diaspora.domain.model.Country;
import com.afriland.diaspora.domain.model.Nationality;

import java.util.List;

public interface ManageReferentialsUseCase {

    // --- Agences ---
    List<Agency> listAgencies(String q);

    List<Agency> listActiveAgencies(String q);

    /** Agences (actives ou non) rattachées à un pays. */
    List<Agency> listAgenciesByCountry(long countryId);

    /** Agences actives rattachées à un pays (formulaire client). */
    List<Agency> listActiveAgenciesByCountry(long countryId);

    Agency createAgency(String code, String name, String city, String country, Long countryId, Boolean active);

    /** Crée une agence rattachée au pays donné (le libellé pays est repris de name_fr). */
    Agency addAgencyToCountry(long countryId, String code, String name, String city, Boolean active);

    Agency updateAgency(long agencyId, String code, String name, String city, String country, Long countryId,
                        Boolean active);

    /** Désactivation logique. Retourne l'agence désactivée. */
    Agency deleteAgency(long agencyId);

    // --- Nationalités ---
    List<Nationality> listNationalities(String q);

    List<Nationality> listActiveNationalities(String q);

    Nationality createNationality(String code, String label, Boolean active);

    Nationality updateNationality(long nationalityId, String code, String label, Boolean active);

    Nationality deleteNationality(long nationalityId);

    // --- Pays ---
    List<Country> listCountries(String q);

    List<Country> listActiveCountries(String q);

    Country createCountry(String isoCode, String flag, String nameFr, String callingCode,
                          Boolean active, Integer displayOrder);

    Country updateCountry(long countryId, String isoCode, String flag, String nameFr, String callingCode,
                          Boolean active, Integer displayOrder);

    Country deleteCountry(long countryId);
}
