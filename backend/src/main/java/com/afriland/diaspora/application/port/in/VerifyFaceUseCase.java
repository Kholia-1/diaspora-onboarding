package com.afriland.diaspora.application.port.in;

import java.util.Map;

/**
 * Vérification faciale KYC : confirme que la vidéo (liveness), le selfie et la
 * photo de la CNI sont la même personne. Renvoie le verdict complet au front.
 */
public interface VerifyFaceUseCase {

    Map<String, Object> verify(byte[] video, String videoName,
                               byte[] selfie, String selfieName,
                               byte[] cni, String cniName);
}
