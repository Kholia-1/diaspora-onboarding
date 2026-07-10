-- V1__baseline.sql — schéma repris du monolithe FastAPI (SQLite) + tables de remplacement des JSON.
-- Généré depuis le schéma SQLite réel le 2026-07-10.

CREATE TABLE backoffice_users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(80) NOT NULL,
    full_name VARCHAR(150),
    password_hash VARCHAR(300) NOT NULL,
    role VARCHAR(50),
    active BOOLEAN,
    created_at TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE INDEX idx_backoffice_users_id ON backoffice_users (id);
CREATE UNIQUE INDEX idx_backoffice_users_username ON backoffice_users (username);

CREATE TABLE backoffice_sessions (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(120) NOT NULL,
    user_id BIGINT NOT NULL REFERENCES backoffice_users(id),
    created_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_backoffice_sessions_id ON backoffice_sessions (id);
CREATE UNIQUE INDEX idx_backoffice_sessions_token ON backoffice_sessions (token);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor VARCHAR(150),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(60),
    user_agent VARCHAR(300),
    created_at TIMESTAMP
);

CREATE INDEX idx_audit_logs_actor ON audit_logs (actor);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs (resource_id);
CREATE INDEX idx_audit_logs_id ON audit_logs (id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs (resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);

CREATE TABLE agencies (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    city VARCHAR(100),
    country VARCHAR(100),
    active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_agencies_name ON agencies (name);
CREATE INDEX idx_agencies_id ON agencies (id);
CREATE UNIQUE INDEX idx_agencies_code ON agencies (code);

CREATE TABLE nationalities (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    label VARCHAR(120) NOT NULL,
    active BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_nationalities_code ON nationalities (code);
CREATE UNIQUE INDEX idx_nationalities_label ON nationalities (label);
CREATE INDEX idx_nationalities_id ON nationalities (id);

CREATE TABLE countries (
    id BIGSERIAL PRIMARY KEY,
    iso_code VARCHAR(5) NOT NULL,
    flag VARCHAR(10),
    name_fr VARCHAR(120) NOT NULL,
    calling_code VARCHAR(20) NOT NULL,
    active BOOLEAN,
    display_order INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_countries_iso_code ON countries (iso_code);
CREATE INDEX idx_countries_id ON countries (id);

CREATE TABLE account_applications (
    id BIGSERIAL PRIMARY KEY,
    reference VARCHAR(80) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    birth_place VARCHAR(150),
    birth_department VARCHAR(150),
    address_location TEXT,
    postal_box VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(150) NOT NULL,
    contact_person_1_name VARCHAR(150),
    contact_person_1_phone VARCHAR(50),
    contact_person_2_name VARCHAR(150),
    contact_person_2_phone VARCHAR(50),
    father_name VARCHAR(150),
    mother_name VARCHAR(150),
    nationality VARCHAR(100),
    residence VARCHAR(150),
    sex VARCHAR(20),
    marital_status VARCHAR(50),
    matrimonial_regime VARCHAR(150),
    identity_document_number VARCHAR(100),
    identity_document_issue_date DATE,
    identity_document_issue_place VARCHAR(150),
    account_type VARCHAR(100),
    preferred_branch VARCHAR(150),
    account_purpose TEXT,
    is_pep BOOLEAN,
    pep_details TEXT,
    status VARCHAR(60),
    risk_level VARCHAR(60),
    kyc_score DOUBLE PRECISION,
    document_score DOUBLE PRECISION,
    blackmodule_status VARCHAR(60),
    blackmodule_score DOUBLE PRECISION,
    blackmodule_alert TEXT,
    reviewed_by VARCHAR(100),
    review_decision VARCHAR(60),
    review_comment TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP,
    submitted_at TIMESTAMP,
    updated_at TIMESTAMP,
    birth_name VARCHAR(150),
    residency_status VARCHAR(50),
    rib VARCHAR(100),
    account_object VARCHAR(150),
    account_object_other TEXT,
    funds_origin VARCHAR(150),
    funds_origin_other TEXT,
    pre_onboarding_session_id VARCHAR(150),
    whatsapp_phone_full VARCHAR(50),
    whatsapp_otp_verified BOOLEAN,
    whatsapp_otp_verified_at TIMESTAMP,
    income_range VARCHAR(100),
    income_currency VARCHAR(20),
    activity_sector VARCHAR(255),
    activity_sector_code VARCHAR(100),
    activity_subsector VARCHAR(255),
    activity_subsector_code VARCHAR(100),
    selected_package_code VARCHAR,
    selected_package_name VARCHAR,
    selected_package_currency VARCHAR,
    selected_package_opening_fee NUMERIC(15,2),
    selected_package_subscription_fee NUMERIC(15,2),
    selected_package_monthly_fee NUMERIC(15,2),
    selected_package_payment_required BOOLEAN,
    package_payment_reference VARCHAR,
    package_payment_status VARCHAR,
    package_payment_provider VARCHAR,
    package_payment_amount NUMERIC(15,2),
    package_payment_currency VARCHAR,
    package_payment_url VARCHAR,
    client_message TEXT,
    final_rib TEXT,
    account_number VARCHAR(100)
);

CREATE INDEX idx_account_applications_id ON account_applications (id);
CREATE UNIQUE INDEX idx_account_applications_reference ON account_applications (reference);

CREATE TABLE application_documents (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES account_applications(id),
    document_type VARCHAR(100) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    sha256_hash VARCHAR(128),
    verification_status VARCHAR(60),
    quality_score DOUBLE PRECISION,
    created_at TIMESTAMP
);

CREATE INDEX idx_application_documents_id ON application_documents (id);

CREATE TABLE payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    payment_reference VARCHAR NOT NULL,
    application_id BIGINT,
    application_reference VARCHAR,
    client_email VARCHAR,
    package_code VARCHAR,
    package_name VARCHAR,
    amount NUMERIC(15,2),
    currency VARCHAR,
    provider VARCHAR,
    provider_item_code VARCHAR,
    provider_transaction_id VARCHAR,
    status VARCHAR,
    payment_url VARCHAR,
    created_at TIMESTAMP,
    paid_at TIMESTAMP,
    failed_at TIMESTAMP,
    raw_response TEXT
);

CREATE INDEX idx_payment_transactions_id ON payment_transactions (id);
CREATE INDEX idx_payment_transactions_application_reference ON payment_transactions (application_reference);
CREATE INDEX idx_payment_transactions_client_email ON payment_transactions (client_email);
CREATE UNIQUE INDEX idx_payment_transactions_payment_reference ON payment_transactions (payment_reference);

CREATE TABLE account_opening_records (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT,
    application_reference VARCHAR NOT NULL,
    client_email VARCHAR,
    account_number VARCHAR NOT NULL,
    rib VARCHAR NOT NULL,
    status VARCHAR,
    created_at TIMESTAMP,
    raw_payload TEXT
);

CREATE INDEX idx_account_opening_records_id ON account_opening_records (id);
CREATE INDEX idx_account_opening_records_client_email ON account_opening_records (client_email);
CREATE INDEX idx_account_opening_records_status ON account_opening_records (status);
CREATE UNIQUE INDEX idx_account_opening_records_application_reference ON account_opening_records (application_reference);
CREATE INDEX idx_account_opening_records_account_number ON account_opening_records (account_number);
CREATE INDEX idx_account_opening_records_application_id ON account_opening_records (application_id);


-- Remplace data/packages.json
CREATE TABLE packages (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    currency VARCHAR(10),
    opening_fee NUMERIC(15,2) DEFAULT 0,
    subscription_fee NUMERIC(15,2) DEFAULT 0,
    monthly_fee NUMERIC(15,2) DEFAULT 0,
    payment_required BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE (code)
);

-- Remplace data/api_integrations.json (configuration non sensible uniquement ;
-- les secrets restent en variables d'environnement)
CREATE TABLE api_integrations (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT FALSE,
    environment VARCHAR(30),
    provider VARCHAR(80),
    base_url TEXT,
    auth_type VARCHAR(30),
    webhook_url TEXT,
    callback_url TEXT,
    notes TEXT,
    extra_config TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE (code)
);

-- Remplace data/pre_onboarding_otps.json (état OTP du pré-onboarding)
CREATE TABLE pre_onboarding_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(120) NOT NULL,
    phone VARCHAR(40),
    otp_hash VARCHAR(300),
    attempts INTEGER DEFAULT 0,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    delivery_status VARCHAR(50),
    delivery_message_uuid VARCHAR(120),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE (session_id)
);
CREATE INDEX idx_pre_onboarding_sessions_expires ON pre_onboarding_sessions (expires_at);
