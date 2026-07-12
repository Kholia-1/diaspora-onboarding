package com.afriland.diaspora.adapter.in.web.client;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.in.PreOnboardingOcrUseCase;
import com.afriland.diaspora.application.port.in.PreOnboardingOtpUseCase;
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

    public PreOnboardingController(PreOnboardingOcrUseCase ocr, PreOnboardingOtpUseCase otp) {
        this.ocr = ocr;
        this.otp = otp;
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
}
