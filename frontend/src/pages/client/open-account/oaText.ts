/**
 * Textes FR/EN dédiés au parcours d'ouverture de compte, consommés via la
 * langue globale (useLang). Séparés du dictionnaire i18n principal pour rester
 * modulaires.
 */
import { useLang } from '../../../app/i18n'

type Dict = Record<string, string>

const FR: Dict = {
  'page.title': 'Ouverture de compte à distance',
  'page.subtitle':
    'Complétez les étapes ci-dessous pour préparer votre demande. Vos informations sont enregistrées au fur et à mesure.',

  'step.personal': 'Informations personnelles',
  'step.otp': 'Vérification WhatsApp',
  'step.activity': 'Activité & revenus',
  'step.documents': 'Pièces justificatives',
  'step.package': 'Package & récapitulatif',

  'nav.previous': 'Précédent',
  'nav.next': 'Suivant',
  'nav.submit': 'Soumettre ma demande',
  'nav.submitting': 'Envoi en cours…',

  // Étape 1
  'p1.identity_type': "Type de pièce d'identité",
  'p1.select': 'Sélectionnez…',
  'p1.sex': 'Sexe',
  'p1.marital': 'Situation matrimoniale',
  'p1.last_name': 'Nom',
  'p1.first_name': 'Prénom',
  'p1.birth_name': 'Nom de naissance',
  'p1.birth_date': 'Date de naissance',
  'p1.birth_place': 'Lieu de naissance',
  'p1.nationality': 'Nationalité',
  'p1.residence': 'Pays de résidence',
  'p1.residency_status': 'Statut de résidence',
  'p1.email': 'Adresse email',
  'p1.phone': 'Téléphone / WhatsApp (avec indicatif)',
  'p1.address': 'Adresse de résidence',
  'p1.id_number': "Numéro de la pièce d'identité",
  'p1.optional': '(optionnel)',
  'p1.prefill_note':
    'Astuce : à l’étape « Pièces justificatives », la photo de votre pièce d’identité pré-remplira automatiquement ces champs.',

  // Étape 2
  'p2.title': 'Vérifiez votre numéro WhatsApp',
  'p2.desc':
    'Nous envoyons un code à 6 chiffres sur votre numéro WhatsApp pour sécuriser votre demande.',
  'p2.phone': 'Numéro WhatsApp (avec indicatif pays)',
  'p2.send': 'Envoyer le code',
  'p2.sending': 'Envoi…',
  'p2.resend': 'Renvoyer le code',
  'p2.code': 'Code à 6 chiffres',
  'p2.verify': 'Vérifier',
  'p2.verifying': 'Vérification…',
  'p2.verified': 'Numéro WhatsApp vérifié.',
  'p2.demo': 'Mode démo — code : ',
  'p2.sent': 'Un code a été envoyé sur WhatsApp. Saisissez-le ci-dessous.',
  'p2.skip_note': 'La vérification est recommandée mais vous pouvez continuer et la finaliser plus tard.',

  // Étape 3
  'p3.account_type': 'Type de compte',
  'p3.sector': "Secteur d'activité",
  'p3.subsector': "Sous-secteur d'activité",
  'p3.subsector_hint': "Sélectionnez d'abord un secteur.",
  'p3.income': 'Tranche de revenus mensuels',
  'p3.branch': 'Agence souhaitée',
  'p3.rib': 'RIB existant',
  'p3.loading': 'Chargement…',

  // Étape 4
  'p4.title': 'Pièces justificatives',
  'p4.desc':
    'Ajoutez les pièces demandées pour votre type de compte. Vous pouvez photographier chaque document ou importer un fichier.',
  'p4.no_account_type':
    'Sélectionnez d’abord un type de compte à l’étape précédente pour voir les pièces requises.',
  'p4.capture': 'Prendre une photo',
  'p4.import': 'Importer un fichier',
  'p4.replace': 'Remplacer',
  'p4.required': 'Requis',
  'p4.optional': 'Optionnel',
  'p4.ocr_running': 'Lecture du document…',
  'p4.ocr_done': 'Informations lues et pré-remplies.',
  'p4.ocr_partial': 'Document ajouté (aucune information exploitable détectée).',
  'p4.ocr_error': 'Lecture automatique indisponible, le document a bien été ajouté.',

  // Étape 5
  'p5.title': 'Choisissez votre package',
  'p5.desc': 'Sélectionnez l’offre qui correspond à vos besoins.',
  'p5.opening_fee': 'Frais d’ouverture',
  'p5.subscription_fee': 'Abonnement',
  'p5.monthly_fee': 'Mensualité',
  'p5.payment_required': 'Paiement requis',
  'p5.free': 'Offert',
  'p5.selected': 'Sélectionné',
  'p5.select': 'Choisir',
  'p5.recap': 'Récapitulatif',
  'p5.recap.identity': 'Identité',
  'p5.recap.contact': 'Contact',
  'p5.recap.activity': 'Activité',
  'p5.recap.account': 'Compte',
  'p5.recap.documents': 'Documents',
  'p5.recap.package': 'Package',

  // Succès
  'ok.title': 'Demande envoyée avec succès',
  'ok.desc': 'Votre dossier a bien été enregistré. Conservez votre référence pour le suivi.',
  'ok.reference': 'Référence de votre dossier',
  'ok.track': 'Suivre ma demande',
  'ok.home': 'Retour à l’accueil',
  'ok.docs_partial':
    'Votre dossier a été créé mais certaines pièces n’ont pas pu être envoyées : ',
  'ok.docs_retry': 'Réessayer l’envoi des pièces manquantes',

  // Erreurs / validation
  'err.required_fields': 'Veuillez renseigner les champs obligatoires (nom, prénom, email).',
  'err.email_invalid': 'Veuillez saisir une adresse email valide.',
  'err.phone_required': 'Veuillez renseigner votre numéro WhatsApp avec l’indicatif du pays.',
  'err.account_type_required': 'Veuillez sélectionner un type de compte.',
  'err.identity_required': "Veuillez ajouter votre pièce d'identité.",
  'err.generic': 'Une erreur est survenue. Veuillez réessayer.',
}

const EN: Dict = {
  'page.title': 'Remote account opening',
  'page.subtitle':
    'Complete the steps below to prepare your request. Your information is saved as you go.',

  'step.personal': 'Personal information',
  'step.otp': 'WhatsApp verification',
  'step.activity': 'Activity & income',
  'step.documents': 'Supporting documents',
  'step.package': 'Package & summary',

  'nav.previous': 'Previous',
  'nav.next': 'Next',
  'nav.submit': 'Submit my request',
  'nav.submitting': 'Submitting…',

  'p1.identity_type': 'Identity document type',
  'p1.select': 'Select…',
  'p1.sex': 'Sex',
  'p1.marital': 'Marital status',
  'p1.last_name': 'Last name',
  'p1.first_name': 'First name',
  'p1.birth_name': 'Birth name',
  'p1.birth_date': 'Date of birth',
  'p1.birth_place': 'Place of birth',
  'p1.nationality': 'Nationality',
  'p1.residence': 'Country of residence',
  'p1.residency_status': 'Residency status',
  'p1.email': 'Email address',
  'p1.phone': 'Phone / WhatsApp (with country code)',
  'p1.address': 'Home address',
  'p1.id_number': 'Identity document number',
  'p1.optional': '(optional)',
  'p1.prefill_note':
    'Tip: in the “Supporting documents” step, a photo of your ID will automatically fill these fields.',

  'p2.title': 'Verify your WhatsApp number',
  'p2.desc': 'We send a 6-digit code to your WhatsApp number to secure your request.',
  'p2.phone': 'WhatsApp number (with country code)',
  'p2.send': 'Send code',
  'p2.sending': 'Sending…',
  'p2.resend': 'Resend code',
  'p2.code': '6-digit code',
  'p2.verify': 'Verify',
  'p2.verifying': 'Verifying…',
  'p2.verified': 'WhatsApp number verified.',
  'p2.demo': 'Demo mode — code: ',
  'p2.sent': 'A code has been sent on WhatsApp. Enter it below.',
  'p2.skip_note': 'Verification is recommended but you can continue and complete it later.',

  'p3.account_type': 'Account type',
  'p3.sector': 'Activity sector',
  'p3.subsector': 'Activity sub-sector',
  'p3.subsector_hint': 'Select a sector first.',
  'p3.income': 'Monthly income range',
  'p3.branch': 'Preferred branch',
  'p3.rib': 'Existing RIB',
  'p3.loading': 'Loading…',

  'p4.title': 'Supporting documents',
  'p4.desc':
    'Add the documents required for your account type. You can take a photo of each document or upload a file.',
  'p4.no_account_type':
    'Select an account type in the previous step first to see the required documents.',
  'p4.capture': 'Take a photo',
  'p4.import': 'Upload a file',
  'p4.replace': 'Replace',
  'p4.required': 'Required',
  'p4.optional': 'Optional',
  'p4.ocr_running': 'Reading document…',
  'p4.ocr_done': 'Information read and pre-filled.',
  'p4.ocr_partial': 'Document added (no usable information detected).',
  'p4.ocr_error': 'Automatic reading unavailable, the document was added.',

  'p5.title': 'Choose your package',
  'p5.desc': 'Select the offer that matches your needs.',
  'p5.opening_fee': 'Opening fee',
  'p5.subscription_fee': 'Subscription',
  'p5.monthly_fee': 'Monthly fee',
  'p5.payment_required': 'Payment required',
  'p5.free': 'Free',
  'p5.selected': 'Selected',
  'p5.select': 'Select',
  'p5.recap': 'Summary',
  'p5.recap.identity': 'Identity',
  'p5.recap.contact': 'Contact',
  'p5.recap.activity': 'Activity',
  'p5.recap.account': 'Account',
  'p5.recap.documents': 'Documents',
  'p5.recap.package': 'Package',

  'ok.title': 'Request submitted successfully',
  'ok.desc': 'Your application has been registered. Keep your reference number for tracking.',
  'ok.reference': 'Your application reference',
  'ok.track': 'Track my request',
  'ok.home': 'Back to home',
  'ok.docs_partial':
    'Your application was created but some documents could not be sent: ',
  'ok.docs_retry': 'Retry sending the missing documents',

  'err.required_fields': 'Please fill in the required fields (last name, first name, email).',
  'err.email_invalid': 'Please enter a valid email address.',
  'err.phone_required': 'Please enter your WhatsApp number with the country code.',
  'err.account_type_required': 'Please select an account type.',
  'err.identity_required': 'Please add your identity document.',
  'err.generic': 'An error occurred. Please try again.',
}

const MESSAGES = { fr: FR, en: EN }

export function useOaText() {
  const { lang } = useLang()
  const t = (key: string) => MESSAGES[lang][key] ?? MESSAGES.fr[key] ?? key
  return { t, lang }
}
