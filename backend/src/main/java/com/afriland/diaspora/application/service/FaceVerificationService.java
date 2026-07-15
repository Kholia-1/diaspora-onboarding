package com.afriland.diaspora.application.service;

import com.afriland.diaspora.application.port.in.VerifyFaceUseCase;
import com.afriland.diaspora.application.port.out.FacePort;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/** Orchestration de la vérification faciale (délègue au microservice via FacePort). */
@Service
public class FaceVerificationService implements VerifyFaceUseCase {

    private final FacePort facePort;

    public FaceVerificationService(FacePort facePort) {
        this.facePort = facePort;
    }

    @Override
    public Map<String, Object> verify(byte[] video, String videoName,
                                      byte[] selfie, String selfieName,
                                      byte[] cni, String cniName) {
        FacePort.FaceVerification v = facePort.verify(video, videoName, selfie, selfieName, cni, cniName);

        if (!v.available()) {
            Map<String, Object> unavailable = new LinkedHashMap<>();
            unavailable.put("available", false);
            unavailable.put("status", "SERVICE_UNAVAILABLE");
            unavailable.put("match", false);
            unavailable.put("error", v.error());
            return unavailable;
        }

        Map<String, Object> result = new LinkedHashMap<>(v.result());
        result.put("available", true);
        return result;
    }
}
