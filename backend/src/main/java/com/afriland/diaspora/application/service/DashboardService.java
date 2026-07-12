package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.port.in.DashboardUseCase;
import com.afriland.diaspora.application.port.out.ApplicationRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DashboardService implements DashboardUseCase {

    private final ApplicationRepositoryPort applications;

    public DashboardService(ApplicationRepositoryPort applications) {
        this.applications = applications;
    }

    @Override
    public DashboardSummary summary() {
        return new DashboardSummary(
                applications.countAll(),
                applications.countByStatus("SUBMITTED"),
                applications.countByStatus("BLACKMODULE_ALERT"),
                applications.countByStatus("COMPLIANCE_REVIEW"),
                applications.countByStatus("APPROVED"),
                applications.countByStatus("REJECTED"),
                applications.countByStatus("ACCOUNT_OPENED"));
    }
}
