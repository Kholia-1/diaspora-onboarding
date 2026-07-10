package com.afriland.diaspora.application.port.out;

import java.util.Optional;

public interface DocumentStoragePort {

    /**
     * Lit un fichier référencé par la colonne file_path (chemin relatif à la racine
     * du dépôt, séparateurs Windows possibles). Optional.empty() si le fichier n'existe pas.
     */
    Optional<byte[]> read(String storedPath);
}
