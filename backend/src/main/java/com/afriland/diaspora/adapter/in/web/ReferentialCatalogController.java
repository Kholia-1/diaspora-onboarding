package com.afriland.diaspora.adapter.in.web;

import com.afriland.diaspora.application.exception.ApiException;
import com.afriland.diaspora.config.AppProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Référentiels statiques du formulaire client (secteurs, sous-secteurs, packages),
 * servis depuis data/*.json — parité avec le monolithe (web.py /api/sectors/active,
 * subsectors.py, packages.json). Endpoints publics (utilisés avant authentification).
 */
@RestController
public class ReferentialCatalogController {

    private final Path dataDir;
    private final ObjectMapper mapper = new ObjectMapper();

    public ReferentialCatalogController(AppProperties properties) {
        String baseDir = properties.storage() != null ? properties.storage().baseDir() : ".";
        this.dataDir = Path.of(baseDir, "data");
    }

    /** Secteurs d'activité : liste {code, name}. */
    @GetMapping("/api/sectors/active")
    public List<Map<String, Object>> activeSectors() {
        return readArray("bank_sectors.json");
    }

    /** Sous-secteurs : liste {code, label, sector_code, sector}. */
    @GetMapping("/api/subsectors/active")
    public List<Map<String, Object>> activeSubsectors() {
        return readArray("bank_subsectors.json");
    }

    /** Sous-secteurs rattachés à un secteur donné. */
    @GetMapping("/api/subsectors/by-sector/{sectorCode}")
    public List<Map<String, Object>> subsectorsBySector(@PathVariable String sectorCode) {
        List<Map<String, Object>> all = readArray("bank_subsectors.json");
        List<Map<String, Object>> filtered = new ArrayList<>();
        for (Map<String, Object> item : all) {
            if (sectorCode.equalsIgnoreCase(String.valueOf(item.get("sector_code")))) {
                filtered.add(item);
            }
        }
        return filtered;
    }

    /** Packages actifs proposés au client (frais + services). */
    @GetMapping("/api/packages/active")
    public List<Map<String, Object>> activePackages() {
        JsonNode root = readJson("packages.json");
        JsonNode packages = root.has("packages") ? root.get("packages") : root;
        List<Map<String, Object>> result = new ArrayList<>();
        for (JsonNode node : packages) {
            if (!node.path("active").asBoolean(true)) {
                continue;
            }
            result.add(mapper.convertValue(node, Map.class));
        }
        result.sort((a, b) -> Integer.compare(order(a), order(b)));
        return result;
    }

    private static int order(Map<String, Object> pkg) {
        Object v = pkg.get("display_order");
        return v instanceof Number n ? n.intValue() : 1000;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> readArray(String filename) {
        JsonNode node = readJson(filename);
        if (!node.isArray()) {
            return List.of();
        }
        return mapper.convertValue(node, List.class);
    }

    private JsonNode readJson(String filename) {
        Path file = dataDir.resolve(filename);
        try {
            if (!Files.exists(file)) {
                return mapper.createArrayNode();
            }
            return mapper.readTree(Files.readString(file));
        } catch (Exception e) {
            throw new ApiException(500, "Lecture du référentiel impossible : " + filename);
        }
    }
}
