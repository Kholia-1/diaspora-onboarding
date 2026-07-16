-- AFB_DRAFT_STAGE_MARKER_V1 : marqueur de progression du brouillon.
-- DOCUMENTS = étape 0 (pièces à charger) ; FORM = formulaire atteint.
-- La reprise de dossier ramène le client exactement là où il s'était arrêté.
ALTER TABLE pre_onboarding_drafts
    ADD COLUMN stage VARCHAR(20) NOT NULL DEFAULT 'DOCUMENTS';
