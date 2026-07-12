package com.afriland.diaspora.adapter.out.storage;

import com.afriland.diaspora.application.port.out.DocumentStoragePort;
import com.afriland.diaspora.config.AppProperties;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

/**
 * Lecture des documents sur disque. La colonne file_path contient des chemins
 * RELATIFS à la racine du dépôt, avec des séparateurs Windows (ex :
 * "uploads\DIA-..._PHOTO_....png") : on normalise puis on résout contre app.storage.base-dir.
 */
@Component
public class FileSystemDocumentStorageAdapter implements DocumentStoragePort {

    private final Path baseDir;

    public FileSystemDocumentStorageAdapter(AppProperties properties) {
        this.baseDir = Path.of(properties.storage().baseDir()).toAbsolutePath().normalize();
    }

    @Override
    public Optional<byte[]> read(String storedPath) {
        if (storedPath == null || storedPath.isBlank()) {
            return Optional.empty();
        }

        String normalized = storedPath.replace('\\', '/');
        Path candidate = Path.of(normalized);
        Path resolved = candidate.isAbsolute()
                ? candidate.normalize()
                : baseDir.resolve(normalized).normalize();

        if (!Files.isRegularFile(resolved)) {
            return Optional.empty();
        }

        try {
            return Optional.of(Files.readAllBytes(resolved));
        } catch (IOException e) {
            return Optional.empty();
        }
    }
}
