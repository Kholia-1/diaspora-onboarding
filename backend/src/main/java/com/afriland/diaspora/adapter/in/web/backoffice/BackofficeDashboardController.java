package com.afriland.diaspora.adapter.in.web.backoffice;

import com.afriland.diaspora.application.port.in.DashboardUseCase;
import com.afriland.diaspora.application.port.in.DashboardUseCase.DashboardSummary;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BackofficeDashboardController {

    private final DashboardUseCase dashboard;

    public BackofficeDashboardController(DashboardUseCase dashboard) {
        this.dashboard = dashboard;
    }

    @GetMapping("/api/backoffice/dashboard/summary")
    public DashboardSummary summary() {
        return dashboard.summary();
    }
}
