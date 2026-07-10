package com.afriland.diaspora.application.port.out;

public interface DocumentCryptoPort {

    /**
     * Déchiffre un token Fernet (octets du fichier tel que stocké).
     *
     * @throws RuntimeException si le token est invalide ou la clé incorrecte.
     */
    byte[] decrypt(byte[] token);

    /** Vrai si le contenu ressemble à un token Fernet (préfixe "gAAAA"). */
    boolean looksEncrypted(byte[] raw);
}
