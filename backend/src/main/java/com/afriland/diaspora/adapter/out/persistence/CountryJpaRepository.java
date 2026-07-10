package com.afriland.diaspora.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CountryJpaRepository extends JpaRepository<CountryEntity, Long> {

    List<CountryEntity> findAllByOrderByDisplayOrderAscNameFrAsc();

    List<CountryEntity> findByActiveTrueOrderByDisplayOrderAscNameFrAsc();

    boolean existsByIsoCode(String isoCode);

    @Query("select c from CountryEntity c where lower(c.isoCode) like :pattern"
            + " or lower(c.nameFr) like :pattern or lower(c.callingCode) like :pattern"
            + " order by c.displayOrder asc, c.nameFr asc")
    List<CountryEntity> search(@Param("pattern") String pattern);

    @Query("select c from CountryEntity c where c.active = true and (lower(c.isoCode) like :pattern"
            + " or lower(c.nameFr) like :pattern or lower(c.callingCode) like :pattern)"
            + " order by c.displayOrder asc, c.nameFr asc")
    List<CountryEntity> searchActive(@Param("pattern") String pattern);
}
