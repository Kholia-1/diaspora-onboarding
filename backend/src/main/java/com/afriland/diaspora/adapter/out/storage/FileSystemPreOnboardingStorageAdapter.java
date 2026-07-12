package com.afriland.diaspora.adapter.out.storage;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.out.PreOnboardingStoragePort;
import com.afriland.diaspora.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Stockage disque des fichiers de session pré-onboarding — parité stricte avec
 * save-file / session du legacy (arborescence PRE_ONBOARDING_UPLOAD_DIR/<session>/,
 * fichiers <document>_<uuid><suffix> + métadonnées JSON).
 */
@Component
public class FileSystemPreOnboardingStorageAdapter implements PreOnboardingStoragePort {

    private static final Logger log = LoggerFactory.getLogger(FileSystemPreOnboardingStorageAdapter.class);

    private static final Set<String> ALLOWED_SUFFIXES = Set.of(
            ".jpg", ".jpeg", ".png", ".webp", ".pdf", ".mp4", ".webm", ".mov");
    private static final long MAX_SIZE = 60L * 1024 * 1024;

    private final JsonMapper json = JsonMapper.builder().build();
    private final Path uploadRoot;

    public FileSystemPreOnboardingStorageAdapter(AppProperties properties) {
        String configured = properties.preOnboarding() != null ? properties.preOnboarding().uploadDir() : null;
        String uploadDir = configured == null || configured.isBlank() ? "uploads/pre_onboarding" : configured;

        Path candidate = Path.of(uploadDir);
        if (candidate.isAbsolute()) {
            this.uploadRoot = candidate.normalize();
        } else {
            // Chemins relatifs résolus contre la racine du dépôt (comme le legacy depuis le CWD repo).
            Path baseDir = Path.of(properties.storage().baseDir()).toAbsolutePath().normalize();
            this.uploadRoot = baseDir.resolve(uploadDir).normalize();
        }
    }

    @Override
    public Map<String, Object> saveFile(String sessionId, String accountType, String documentType,
                                        String originalName, String contentType, byte[] content) {
        if (content == null || content.length == 0) {
            throw ApiException.badRequest("Fichier vide");
        }
        if (content.length > MAX_SIZE) {
            throw new ApiException(413, "Fichier trop volumineux");
        }

        String sessionSafe = clean(sessionId, "session");
        String accountSafe = clean(accountType, "account");
        String documentSafe = clean(documentType, "document");

        Path targetDir = uploadRoot.resolve(sessionSafe);

        String name = originalName == null || originalName.isEmpty() ? "capture" : originalName;
        String suffix = suffixOf(name);
        if (!ALLOWED_SUFFIXES.contains(suffix)) {
            suffix = ".bin";
        }

        String preDocumentId = UUID.randomUUID().toString().replace("-", "");
        String storedName = documentSafe + "_" + preDocumentId + suffix;
        Path targetPath = targetDir.resolve(storedName);

        try {
            Files.createDirectories(targetDir);
            Files.write(targetPath, content);
        } catch (IOException e) {
            throw ApiException.internal("Impossible d'enregistrer le fichier de session.");
        }

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("pre_document_id", preDocumentId);
        metadata.put("session_id", sessionSafe);
        metadata.put("account_type", accountSafe);
        metadata.put("document_type", documentSafe);
        metadata.put("original_name", name);
        metadata.put("stored_name", storedName);
        metadata.put("relative_path", targetPath.toString());
        metadata.put("content_type", contentType);
        metadata.put("size", content.length);
        metadata.put("created_at", LocalDateTime.now(ZoneOffset.UTC) + "Z");
        metadata.put("status", "TEMP_SAVED");

        Path metadataPath = targetDir.resolve(documentSafe + "_" + preDocumentId + ".json");
        try {
            Files.writeString(metadataPath, json.writeValueAsString(metadata), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw ApiException.internal("Impossible d'enregistrer les métadonnées de session.");
        }

        return metadata;
    }

    @Override
    public SessionView readSession(String sessionId) {
        String sessionSafe = clean(sessionId, "session");
        Path targetDir = uploadRoot.resolve(sessionSafe);

        if (!Files.isDirectory(targetDir)) {
            return new SessionView(sessionSafe, false, List.of(), Map.of());
        }

        List<Map<String, Object>> documents = new ArrayList<>();
        try (Stream<Path> files = Files.list(targetDir)) {
            files.filter(p -> p.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".json"))
                    .filter(p -> !p.getFileName().toString().equals("ocr_fields.json"))
                    .sorted()
                    .forEach(p -> readJsonMap(p).ifPresent(documents::add));
        } catch (IOException e) {
            log.warn("[PRE-ONBOARDING] lecture session {} impossible : {}", sessionSafe, e.getMessage());
        }

        Map<String, Object> extractedFields = Map.of();
        Path ocrFields = targetDir.resolve("ocr_fields.json");
        if (Files.isRegularFile(ocrFields)) {
            extractedFields = readJsonMap(ocrFields)
                    .map(m -> asMap(m.get("fields")))
                    .orElse(Map.of());
        }

        return new SessionView(sessionSafe, true, documents, extractedFields);
    }

    private java.util.Optional<Map<String, Object>> readJsonMap(Path path) {
        try {
            String raw = Files.readString(path, StandardCharsets.UTF_8);
            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = json.readValue(raw, Map.class);
            return java.util.Optional.ofNullable(parsed);
        } catch (Exception e) {
            return java.util.Optional.empty();
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Map.of();
    }

    /** Parité clean() du legacy : [^A-Za-z0-9_-] → "_", tronqué à 80, valeur par défaut si vide. */
    private static String clean(String value, String defaultValue) {
        String v = (value == null ? "" : value).strip();
        v = v.replaceAll("[^A-Za-z0-9_-]", "_");
        if (v.length() > 80) {
            v = v.substring(0, 80);
        }
        return v.isEmpty() ? defaultValue : v;
    }

    private static String suffixOf(String name) {
        int dot = name.lastIndexOf('.');
        if (dot < 0) {
            return "";
        }
        return name.substring(dot).toLowerCase(Locale.ROOT);
    }
}
