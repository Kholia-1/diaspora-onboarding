-- V2 : rattachement des agences à un pays (relation 1..N countries -> agencies).
-- Un pays possède plusieurs agences ; chaque agence référence son pays via country_id.
-- La colonne texte `country` est conservée (parité FastAPI / consommateurs existants) et
-- tenue synchrone avec name_fr du pays côté service.

ALTER TABLE agencies ADD COLUMN country_id BIGINT REFERENCES countries(id);

-- Rattache les agences existantes (toutes « Cameroun » par défaut) au pays correspondant,
-- par correspondance insensible à la casse/espaces entre agencies.country et countries.name_fr.
UPDATE agencies a
SET country_id = c.id
FROM countries c
WHERE a.country_id IS NULL
  AND a.country IS NOT NULL
  AND lower(trim(a.country)) = lower(trim(c.name_fr));

CREATE INDEX idx_agencies_country_id ON agencies (country_id);
