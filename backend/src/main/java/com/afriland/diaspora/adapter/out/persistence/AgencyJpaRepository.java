package com.afriland.diaspora.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AgencyJpaRepository extends JpaRepository<AgencyEntity, Long> {

    List<AgencyEntity> findAllByOrderByNameAsc();

    List<AgencyEntity> findByActiveTrueOrderByNameAsc();

    boolean existsByCode(String code);

    boolean existsByName(String name);

    @Query("select a from AgencyEntity a where lower(a.name) like :pattern or lower(a.code) like :pattern"
            + " or lower(a.city) like :pattern order by a.name asc")
    List<AgencyEntity> search(@Param("pattern") String pattern);

    @Query("select a from AgencyEntity a where a.active = true and (lower(a.name) like :pattern"
            + " or lower(a.code) like :pattern or lower(a.city) like :pattern) order by a.name asc")
    List<AgencyEntity> searchActive(@Param("pattern") String pattern);
}
