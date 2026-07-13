package com.afriland.diaspora.adapter.out.storage;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.out.DocumentStoragePort;
import com.afriland.diaspora.config.AppProperties;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

/**
 * Stockage disque des documents de dossier. La colonne file_path contient des chemins
 * RELATIFS à la racine du dépôt, avec des séparateurs Windows possibles (ex :
 * "uploads\DIA-..._PHOTO_....png.enc") : on normalise puis on résout contre app.storage.base-dir.
 */
@Component
public class FileSystemDocumentStorageAdapter implements DocumentStoragePort {

    private final Path baseDir;
    private final Path uploadDir;
    private final String uploadDirName;

    public FileSystemDocumentStorageAdapter(AppProperties properties) {
        this.baseDir = Path.of(properties.storage().baseDir()).toAbsolutePath().normalize();

        String configured = properties.applicationUploadDir();
        String dir = configured == null || configured.isBlank() ? "uploads" : configured;
        this.uploadDirName = dir;

        Path candidate = Path.of(dir);
        this.uploadDir = candidate.isAbsolute()
                ? candidate.normalize()
                : baseDir.resolve(dir).normalize();
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

    @Override
    public String saveApplicationDocument(String fileName, byte[] encryptedContent, byte[] encryptedAnalysis) {
        try {
            Files.createDirectories(uploadDir);
            Path target = uploadDir.resolve(fileName);
            Files.write(target, encryptedContent);

            if (encryptedAnalysis != null) {
                Files.write(uploadDir.resolve(fileName + ".analysis.enc"), encryptedAnalysis);
            }

            // file_path stocké : relatif à la racine du dépôt si possible (parité "uploads/<fichier>").
            if (target.startsWith(baseDir)) {
                return baseDir.relativize(target).toString().replace('\\', '/');
            }
            // Chemin absolu (upload-dir absolu) : normalisé en séparateurs "/".
            return uploadDirName.replace('\\', '/') + "/" + fileName;
        } catch (IOException e) {
            throw ApiException.internal("Impossible d'enregistrer le document.");
        }
    }
}
