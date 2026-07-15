package com.afriland.diaspora.adapter.in.web.client;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.PreOnboardingDraftUseCase;
import com.afriland.diaspora.application.port.in.PreOnboardingOcrUseCase;
import com.afriland.diaspora.application.port.in.PreOnboardingOtpUseCase;
import com.afriland.diaspora.application.port.in.VerifyFaceUseCase;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * Pré-onboarding client — endpoints PUBLICS (permitAll dans SecurityConfig).
 * Parité stricte avec app/routers/pre_onboarding.py.
 */
@RestController
@RequestMapping("/api/pre-onboarding")
public class PreOnboardingController {

    private final PreOnboardingOcrUseCase ocr;
    private final PreOnboardingOtpUseCase otp;
    private final PreOnboardingDraftUseCase drafts;
    private final VerifyFaceUseCase faceVerification;

    public PreOnboardingController(PreOnboardingOcrUseCase ocr, PreOnboardingOtpUseCase otp,
                                   PreOnboardingDraftUseCase drafts, VerifyFaceUseCase faceVerification) {
        this.ocr = ocr;
        this.otp = otp;
        this.drafts = drafts;
        this.faceVerification = faceVerification;
    }

    // AFB_PREONBOARDING_DRAFT_RESUME_V1 — brouillon serveur et reprise de dossier.

    @PostMapping("/draft/save")
    public Map<String, Object> saveDraft(@RequestBody(required = false) Map<String, Object> payload) {
        return drafts.saveDraft(payload == null ? Map.of() : payload);
    }

    @PostMapping("/draft/search")
    public Map<String, Object> searchDrafts(@RequestBody(required = false) Map<String, Object> payload) {
        return drafts.searchDrafts(payload == null ? Map.of() : payload);
    }

    @PostMapping("/draft/claim")
    public Map<String, Object> claimDraft(@RequestBody(required = false) Map<String, Object> payload) {
        return drafts.claimDraft(payload == null ? Map.of() : payload);
    }

    @PostMapping("/draft/verify")
    public Map<String, Object> verifyDraft(@RequestBody(required = false) Map<String, Object> payload) {
        return drafts.verifyDraft(payload == null ? Map.of() : payload);
    }

    @PostMapping("/draft/open")
    public Map<String, Object> openDraft(@RequestBody(required = false) Map<String, Object> payload) {
        return drafts.openDraft(payload == null ? Map.of() : payload);
    }

    @PostMapping("/ocr")
    public Map<String, Object> ocr(@RequestParam("account_type") String accountType,
                                   @RequestParam("document_type") String documentType,
                                   @RequestParam(value = "session_id", required = false) String sessionId,
                                   @RequestParam("file") MultipartFile file) {
        return ocr.runOcr(accountType, documentType, sessionId,
                file.getOriginalFilename(), file.getContentType(), readBytes(file));
    }

    @PostMapping("/save-file")
    public Map<String, Object> saveFile(@RequestParam("session_id") String sessionId,
                                        @RequestParam("account_type") String accountType,
                                        @RequestParam("document_type") String documentType,
                                        @RequestParam("file") MultipartFile file) {
        return ocr.saveFile(sessionId, accountType, documentType,
                file.getOriginalFilename(), file.getContentType(), readBytes(file));
    }

    @GetMapping("/session/{sessionId}")
    public Map<String, Object> getSession(@PathVariable String sessionId) {
        return ocr.getSession(sessionId);
    }

    /**
     * Vérification faciale KYC : la vidéo (liveness), le selfie et la photo de la
     * CNI sont-ils la même personne ? Sources multipart (toutes optionnelles, mais
     * le verdict exige vidéo + CNI). Délègue au microservice (ArcFace).
     */
    @PostMapping("/face-verify")
    public Map<String, Object> faceVerify(
            @RequestParam(value = "video", required = false) MultipartFile video,
            @RequestParam(value = "selfie", required = false) MultipartFile selfie,
            @RequestParam(value = "cni", required = false) MultipartFile cni) {
        return faceVerification.verify(
                bytesOrNull(video), nameOrNull(video),
                bytesOrNull(selfie), nameOrNull(selfie),
                bytesOrNull(cni), nameOrNull(cni));
    }

    @PostMapping("/otp/send")
    public Map<String, Object> sendOtp(@RequestBody(required = false) Map<String, Object> payload) {
        return otp.sendOtp(payload == null ? Map.of() : payload);
    }

    @PostMapping("/otp/verify")
    public Map<String, Object> verifyOtp(@RequestBody(required = false) Map<String, Object> payload) {
        return otp.verifyOtp(payload == null ? Map.of() : payload);
    }

    @GetMapping("/otp/status/{sessionId}")
    public Map<String, Object> otpStatus(@PathVariable String sessionId) {
        return otp.otpStatus(sessionId);
    }

    @GetMapping("/otp/delivery-status/{sessionId}")
    public Map<String, Object> otpDeliveryStatus(@PathVariable String sessionId) {
        return otp.deliveryStatus(sessionId);
    }

    private static byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw ApiException.badRequest("Fichier illisible.");
        }
    }

    private static byte[] bytesOrNull(MultipartFile file) {
        return (file == null || file.isEmpty()) ? null : readBytes(file);
    }

    private static String nameOrNull(MultipartFile file) {
        return file == null ? null : file.getOriginalFilename();
    }
}
