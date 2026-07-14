package com.afriland.diaspora.adapter.in.web.backoffice;

import com.afriland.diaspora.application.port.in.BrowseApplicationsUseCase;
import com.afriland.diaspora.application.port.in.BrowseApplicationsUseCase.DocumentView;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/backoffice/applications")
public class BackofficeApplicationsController {

    private final BrowseApplicationsUseCase applications;

    public BackofficeApplicationsController(BrowseApplicationsUseCase applications) {
        this.applications = applications;
    }

    @GetMapping
    public List<ApplicationSummaryDto> listApplications() {
        return applications.listApplications().stream().map(ApplicationSummaryDto::from).toList();
    }

    @GetMapping("/{applicationId}")
    public ApplicationDetailResponse getApplication(@PathVariable String applicationId) {
        var result = applications.getApplication(applicationId);

        List<DocumentDto> documents = result.documents().stream().map(DocumentDto::from).toList();

        return new ApplicationDetailResponse(ApplicationDetailDto.from(result.application()), documents);
    }

    public record ApplicationDetailResponse(ApplicationDetailDto application, List<DocumentDto> documents) {
    }

    public record DocumentDto(
            long id,
            String documentType,
            String documentTypeCode,
            String documentLabel,
            String originalFilename,
            String mimeType,
            String verificationStatus,
            Double qualityScore,
            String sha256Hash,
            String contentUrl,
            String analysisUrl,
            boolean canAnalyze,
            boolean isVideo,
            boolean isMediaOnly) {

        static DocumentDto from(DocumentView doc) {
            // Parité is_analysis_available : URL et bouton d'analyse seulement si
            // l'analyse chiffrée <file_path>.analysis.enc existe (hors média preuve de vie).
            String analysisUrl = doc.analysisAvailable()
                    ? "/api/applications/documents/" + doc.id() + "/analysis"
                    : null;
            return new DocumentDto(
                    doc.id(),
                    doc.documentType(),
                    doc.documentType(),
                    doc.documentLabel(),
                    doc.originalFilename(),
                    doc.mimeType(),
                    doc.verificationStatus(),
                    doc.qualityScore(),
                    doc.sha256Hash(),
                    "/api/applications/documents/" + doc.id() + "/content",
                    analysisUrl,
                    doc.analysisAvailable(),
                    doc.video(),
                    doc.mediaOnly());
        }
    }
}
