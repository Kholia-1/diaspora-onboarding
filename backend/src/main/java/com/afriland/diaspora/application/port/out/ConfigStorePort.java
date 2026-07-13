package com.afriland.diaspora.application.port.out;

import java.util.Map;

/**
 * Persistance des référentiels de configuration éditables (data/*.json) — parité
 * avec le monolithe qui lit/écrit ces fichiers. Adapter fichier JSON assumé.
 */
public interface ConfigStorePort {

    /**
     * Lit un fichier de configuration JSON (objet racine). Si le fichier est absent,
     * écrit la valeur par défaut fournie puis la retourne (parité ensure_*_config).
     */
    Map<String, Object> readOrCreate(String fileName, Map<String, Object> defaultValue);

    /** Écrit (remplace) un fichier de configuration JSON, indenté UTF-8. */
    void write(String fileName, Map<String, Object> data);
}
