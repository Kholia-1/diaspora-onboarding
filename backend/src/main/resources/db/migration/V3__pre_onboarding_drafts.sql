-- AFB_PREONBOARDING_DRAFT_RESUME_V1 : brouillons de formulaire (reprise de dossier).
-- Le brouillon est créé à la validation de la pré-inscription, alimenté par la
-- sauvegarde automatique du formulaire, et retrouvable par téléphone/email après
-- vérification OTP de réappropriation.
CREATE TABLE pre_onboarding_drafts (
    id BIGSERIAL PRIMARY KEY,
    draft_id VARCHAR(120) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(40),
    account_type VARCHAR(30) DEFAULT 'PERSONAL',
    status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
    fields_json TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE (draft_id)
);
CREATE INDEX idx_pre_onboarding_drafts_email ON pre_onboarding_drafts (LOWER(email));
CREATE INDEX idx_pre_onboarding_drafts_status ON pre_onboarding_drafts (status);
