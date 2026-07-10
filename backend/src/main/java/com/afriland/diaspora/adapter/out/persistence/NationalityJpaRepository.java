package com.afriland.diaspora.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NationalityJpaRepository extends JpaRepository<NationalityEntity, Long> {

    List<NationalityEntity> findAllByOrderByLabelAsc();

    List<NationalityEntity> findByActiveTrueOrderByLabelAsc();

    boolean existsByCode(String code);

    boolean existsByLabel(String label);

    @Query("select n from NationalityEntity n where lower(n.label) like :pattern"
            + " or lower(n.code) like :pattern order by n.label asc")
    List<NationalityEntity> search(@Param("pattern") String pattern);

    @Query("select n from NationalityEntity n where n.active = true and (lower(n.label) like :pattern"
            + " or lower(n.code) like :pattern) order by n.label asc")
    List<NationalityEntity> searchActive(@Param("pattern") String pattern);
}
