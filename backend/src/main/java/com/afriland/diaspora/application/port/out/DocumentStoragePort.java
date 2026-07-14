package com.afriland.diaspora.application.port.out;

import java.util.Optional;

public interface DocumentStoragePort {

    /**
     * Lit un fichier référencé par la colonne file_path (chemin relatif à la racine
     * du dépôt, séparateurs Windows possibles). Optional.empty() si le fichier n'existe pas.
     */
    Optional<byte[]> read(String storedPath);

    /**
     * Vrai si un fichier régulier existe au chemin indiqué (relatif à la racine du
     * dépôt ou absolu, séparateurs Windows possibles). Utilisé pour savoir si
     * l'analyse chiffrée {@code <file_path>.analysis.enc} d'un document est disponible.
     */
    boolean exists(String storedPath);

    /**
     * Écrit un document chiffré (.enc) et son analyse chiffrée (.enc.analysis.enc) dans le
     * dossier d'upload des dossiers. Retourne le file_path stocké en base (relatif à la
     * racine du dépôt, parité UPLOAD_DIR/filename du monolithe).
     *
     * @param fileName          nom de fichier .enc (déjà construit par le service)
     * @param encryptedContent  contenu du document, déjà chiffré Fernet
     * @param encryptedAnalysis analyse documentaire, déjà chiffrée (peut être null)
     */
    String saveApplicationDocument(String fileName, byte[] encryptedContent, byte[] encryptedAnalysis);
}
