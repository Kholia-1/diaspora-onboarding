/**
 * Constantes du parcours d'ouverture de compte : options de formulaire et
 * définition des pièces requises par type de compte.
 * (Valeurs alignées sur le parcours legacy client_open_account_manager.html.)
 */
import type { Lang } from '../../../app/i18n'

export interface Option {
  value: string
  label: { fr: string; en: string }
}

export const SEX_OPTIONS: Option[] = [
  { value: 'Masculin', label: { fr: 'Masculin', en: 'Male' } },
  { value: 'Féminin', label: { fr: 'Féminin', en: 'Female' } },
]

export const MARITAL_OPTIONS: Option[] = [
  { value: 'Célibataire', label: { fr: 'Célibataire', en: 'Single' } },
  { value: 'Marié(e)', label: { fr: 'Marié(e)', en: 'Married' } },
  { value: 'Divorcé(e)', label: { fr: 'Divorcé(e)', en: 'Divorced' } },
  { value: 'Veuf/Veuve', label: { fr: 'Veuf / Veuve', en: 'Widowed' } },
]

export const RESIDENCY_OPTIONS: Option[] = [
  { value: 'RESIDENT', label: { fr: 'Résident', en: 'Resident' } },
  { value: 'NON_RESIDENT', label: { fr: 'Non-résident', en: 'Non-resident' } },
]

export const ID_TYPE_OPTIONS: Option[] = [
  {
    value: "Carte nationale d'identité",
    label: { fr: "Carte nationale d'identité", en: 'National ID card' },
  },
  { value: 'Passeport', label: { fr: 'Passeport', en: 'Passport' } },
  { value: 'Titre de séjour', label: { fr: 'Titre de séjour', en: 'Residence permit' } },
  { value: 'Carte consulaire', label: { fr: 'Carte consulaire', en: 'Consular card' } },
]

/** Types nécessitant le verso de la pièce (comme le legacy). */
export const ID_TYPES_WITH_BACK = [
  "Carte nationale d'identité",
  'Carte consulaire',
  'Titre de séjour',
]

export const ACCOUNT_TYPE_OPTIONS: Option[] = [
  { value: 'Compte courant', label: { fr: 'Compte courant', en: 'Current account' } },
  {
    value: 'Compte épargne diaspora',
    label: { fr: 'Compte épargne à distance', en: 'Remote savings account' },
  },
  { value: 'Compte joint', label: { fr: 'Compte joint', en: 'Joint account' } },
]

export const INCOME_RANGE_OPTIONS: Option[] = [
  { value: '0 - 100 000', label: { fr: '0 - 100 000', en: '0 - 100,000' } },
  { value: '100 001 - 300 000', label: { fr: '100 001 - 300 000', en: '100,001 - 300,000' } },
  { value: '300 001 - 500 000', label: { fr: '300 001 - 500 000', en: '300,001 - 500,000' } },
  {
    value: '500 001 - 1 000 000',
    label: { fr: '500 001 - 1 000 000', en: '500,001 - 1,000,000' },
  },
  { value: 'Plus de 1 000 000', label: { fr: 'Plus de 1 000 000', en: 'Over 1,000,000' } },
]

export function optionLabel(option: Option, lang: Lang): string {
  return option.label[lang]
}

// --- Pièces justificatives requises par type de compte ---------------------

export interface RequiredDocument {
  /** Clé stable côté front. */
  key: string
  /** document_type envoyé au backend lors de l'upload. */
  uploadType: string
  label: { fr: string; en: string }
  hint: { fr: string; en: string }
  required: boolean
  /** true = pièce d'identité : déclenche l'OCR et le préremplissage étape 1. */
  isIdentity?: boolean
}

const IDENTITY_DOC: RequiredDocument = {
  key: 'identity',
  uploadType: 'IDENTITY_DOCUMENT_RECTO',
  label: { fr: "Pièce d'identité", en: 'Identity document' },
  hint: {
    fr: "Photographiez ou importez votre pièce d'identité. Les informations seront lues automatiquement.",
    en: 'Take a photo of or upload your ID. The information will be read automatically.',
  },
  required: true,
  isIdentity: true,
}

const PROOF_OF_ADDRESS: RequiredDocument = {
  key: 'address',
  uploadType: 'PROOF_OF_ADDRESS_PHOTO',
  label: { fr: 'Justificatif de domicile', en: 'Proof of address' },
  hint: {
    fr: 'Facture récente (eau, électricité, téléphone) de moins de 3 mois.',
    en: 'Recent utility bill (water, electricity, phone) less than 3 months old.',
  },
  required: true,
}

const BIRTH_CERTIFICATE: RequiredDocument = {
  key: 'birth',
  uploadType: 'BIRTH_CERTIFICATE_PHOTO',
  label: { fr: 'Acte de naissance', en: 'Birth certificate' },
  hint: {
    fr: 'Copie lisible de votre acte de naissance.',
    en: 'Legible copy of your birth certificate.',
  },
  required: false,
}

const CO_HOLDER_ID: RequiredDocument = {
  key: 'co_holder_identity',
  uploadType: 'CO_HOLDER_IDENTITY_DOCUMENT',
  label: { fr: 'Pièce du co-titulaire', en: 'Co-holder identity document' },
  hint: {
    fr: "Pièce d'identité du second titulaire du compte joint.",
    en: 'Identity document of the joint account co-holder.',
  },
  required: true,
}

const SELFIE: RequiredDocument = {
  key: 'selfie',
  uploadType: 'SELFIE_PHOTO',
  label: { fr: 'Photo de vérification (selfie)', en: 'Verification photo (selfie)' },
  hint: {
    fr: 'Optionnel : une photo de votre visage pour accélérer la vérification.',
    en: 'Optional: a photo of your face to speed up verification.',
  },
  required: false,
}

/** Liste des pièces requises selon le type de compte sélectionné. */
export function requiredDocumentsFor(accountType: string): RequiredDocument[] {
  const base = [IDENTITY_DOC, PROOF_OF_ADDRESS]
  if (accountType === 'Compte joint') {
    return [...base, CO_HOLDER_ID, SELFIE]
  }
  if (accountType === 'Compte épargne diaspora') {
    return [...base, BIRTH_CERTIFICATE, SELFIE]
  }
  return [...base, SELFIE]
}
