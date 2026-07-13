package com.afriland.diaspora.adapter.out.config;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.application.port.out.ConfigStorePort;
import com.afriland.diaspora.config.AppProperties;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Persistance fichier JSON des référentiels de config sous &lt;base-dir&gt;/data/,
 * comme le monolithe FastAPI. Choix assumé : ces référentiels éditables restent
 * dans data/*.json (pas de table dédiée), pour rester à parité avec le legacy.
 */
@Component
public class FileSystemConfigStoreAdapter implements ConfigStorePort {

    private final Path dataDir;
    private final ObjectMapper mapper = new ObjectMapper();

    public FileSystemConfigStoreAdapter(AppProperties properties) {
        String baseDir = properties.storage() != null ? properties.storage().baseDir() : ".";
        this.dataDir = Path.of(baseDir, "data");
    }

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, Object> readOrCreate(String fileName, Map<String, Object> defaultValue) {
        Path file = dataDir.resolve(fileName);
        try {
            if (!Files.exists(file)) {
                write(fileName, defaultValue);
                return defaultValue;
            }
            String raw = Files.readString(file, StandardCharsets.UTF_8);
            Object parsed = mapper.readValue(raw, Map.class);
            return parsed instanceof Map ? (Map<String, Object>) parsed : new LinkedHashMap<>();
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.internal("Lecture de la configuration impossible : " + fileName);
        }
    }

    @Override
    public void write(String fileName, Map<String, Object> data) {
        Path file = dataDir.resolve(fileName);
        try {
            Files.createDirectories(dataDir);
            String json = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(data);
            Files.writeString(file, json, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw ApiException.internal("Écriture de la configuration impossible : " + fileName);
        }
    }
}
