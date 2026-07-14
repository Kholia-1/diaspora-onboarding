import {
  Component, ElementRef, EventEmitter, Input, Output, ViewChild, inject, signal,
  ChangeDetectionStrategy, OnDestroy,
} from '@angular/core';
import { DiasporaApi, OcrExtractedFields, OcrResult } from '../core/diaspora-api.service';

/**
 * Capture de pièce d'identité + OCR (préremplissage KYC).
 *
 * Choix technique : capture PRAGMATIQUE (pas de portage OpenCV.js/MediaPipe).
 * - `getUserMedia` + <video>/<canvas> pour une prise de vue live in-app quand
 *   la caméra est disponible (origine sécurisée : https ou http://localhost) ;
 * - repli robuste cross-navigateur via <input type="file" capture="environment">
 *   (ouvre l'appareil photo arrière sur mobile) si la caméra est refusée /
 *   indisponible, ou pour importer un fichier existant.
 *
 * Après capture, l'image est envoyée à POST /api/pre-onboarding/ocr ; le
 * composant émet les `extracted_fields` (préremplissage) ET le `File` brut
 * (conservé pour l'upload ultérieur du document). L'échec OCR n'est pas bloquant :
 * la photo reste jointe, le client peut saisir les champs à la main.
 *
 * Style aligné sur le design-system diaspora (rouge #C8102E, serif Source Serif 4,
 * cartes blanches — cf. ui/section-card.ts).
 */
@Component({
  selector: 'onb-id-capture',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .onb-spin {
      width: 18px; height: 18px; border-radius: 50%;
      border: 2.4px solid rgba(200,16,46,0.25); border-top-color: #C8102E;
      animation: onb-spin 0.7s linear infinite;
    }
    @keyframes onb-spin { to { transform: rotate(360deg); } }
  `],
  template: `
    <div style="background:#FFFFFF;border:1px solid rgba(20,20,30,0.12);border-radius:12px;padding:22px 24px;margin-bottom:16px;font-family:'Inter',system-ui,sans-serif;">
      <!-- En-tête -->
      <div style="margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid rgba(20,20,30,0.08);">
        <div style="font-size:9.5px;font-weight:700;letter-spacing:1.6px;color:#C8102E;text-transform:uppercase;margin-bottom:5px;">
          Capture &amp; lecture automatique
        </div>
        <div style="font-family:'Source Serif 4',Georgia,serif;font-size:17px;font-weight:500;color:#151821;letter-spacing:-0.3px;line-height:1.2;">
          {{ title }}
        </div>
        <div style="font-size:12px;color:#6B7280;margin-top:4px;line-height:1.5;">{{ hint }}</div>
      </div>

      @if (preview(); as img) {
        <!-- Aperçu de l'image capturée / importée -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:14px;">
          <div style="position:relative;width:100%;max-width:420px;border-radius:10px;overflow:hidden;border:1px solid rgba(20,20,30,0.10);background:#0e1116;">
            <img [src]="img" alt="Pièce d'identité" style="width:100%;display:block;object-fit:contain;max-height:280px;" />
          </div>

          @if (loading()) {
            <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:#6B7280;">
              <span class="onb-spin"></span>
              <span>Lecture de la pièce en cours…</span>
            </div>
          } @else if (done()) {
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#166534;font-weight:600;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 L9 17 L4 12"/></svg>
              <span>
                @if (fieldCount() > 0) { {{ fieldCount() }} champ(s) détecté(s) et préremplis. }
                @else { Aucun champ exploitable — saisissez-les manuellement. }
              </span>
            </div>
            @if (verdict()) {
              <div style="font-size:11.5px;color:#9CA3AF;">Qualité : {{ verdict() }}</div>
            }
          } @else if (ocrError()) {
            <p style="font-size:12.5px;color:#C8102E;text-align:center;max-width:360px;line-height:1.5;margin:0;">{{ ocrError() }}</p>
          }

          <button type="button" (click)="retake()"
            style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border:1px solid rgba(20,20,30,0.14);background:#fff;font-size:13px;font-weight:500;color:#151821;cursor:pointer;border-radius:8px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Reprendre
          </button>
        </div>
      } @else if (streaming()) {
        <!-- Prise de vue live via la caméra -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:14px;">
          <div style="position:relative;width:100%;max-width:420px;aspect-ratio:16 / 10;border-radius:10px;overflow:hidden;background:#0e1116;">
            <video #video autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;"></video>
            <span style="position:absolute;inset:12px;border:2px dashed rgba(255,255,255,0.55);border-radius:8px;pointer-events:none;"></span>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
            <button type="button" (click)="capture()"
              style="display:inline-flex;align-items:center;gap:8px;padding:11px 22px;color:#fff;background:#C8102E;border:none;font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;cursor:pointer;border-radius:8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Capturer
            </button>
            <button type="button" (click)="cancelCamera()"
              style="display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border:1px solid rgba(20,20,30,0.14);background:#fff;font-size:13px;font-weight:500;color:#151821;cursor:pointer;border-radius:8px;">
              Annuler
            </button>
          </div>
        </div>
      } @else {
        <!-- Choix initial : caméra ou import de fichier -->
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" (click)="startCamera()" [disabled]="starting()"
              [style.opacity]="starting() ? '0.6' : '1'"
              style="display:inline-flex;align-items:center;gap:8px;padding:11px 22px;color:#fff;background:#C8102E;border:none;font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;cursor:pointer;border-radius:8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              {{ starting() ? 'Ouverture…' : 'Prendre une photo' }}
            </button>
            <button type="button" (click)="openFilePicker()"
              style="display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border:1px solid rgba(20,20,30,0.14);background:#fff;font-size:13px;font-weight:500;color:#151821;cursor:pointer;border-radius:8px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Importer un fichier
            </button>
          </div>
          @if (camError()) {
            <p style="font-size:12px;color:#C8102E;margin:0;line-height:1.5;">{{ camError() }}</p>
          }
        </div>
      }

      <!-- Repli / import : ouvre l'appareil photo arrière sur mobile -->
      <input #fileInput type="file" accept="image/*" capture="environment"
        (change)="onFileChosen($event)" style="display:none;" />
    </div>
  `,
})
export class OnbIdCapture implements OnDestroy {
  private api = inject(DiasporaApi);

  @Input() documentType = 'CNI_RECTO';
  @Input() accountType = '';
  @Input() sessionId?: string;
  @Input() title = "Photo de votre pièce d'identité";
  @Input() hint =
    'Prenez la pièce en photo (recto) ou importez-la : nom, prénom, date de naissance… seront préremplis automatiquement.';

  /** Champs KYC extraits par l'OCR — à mapper vers le formulaire (préremplissage). */
  @Output() extracted = new EventEmitter<OcrExtractedFields>();
  /** Fichier image capturé/importé, conservé pour l'upload ultérieur du document. */
  @Output() fileSelected = new EventEmitter<File>();
  /** Réponse OCR complète (typée), si un consommateur en a besoin. */
  @Output() ocrResult = new EventEmitter<OcrResult>();

  readonly streaming = signal(false);
  readonly starting = signal(false);
  readonly preview = signal<string | null>(null);
  readonly loading = signal(false);
  readonly done = signal(false);
  readonly camError = signal<string | null>(null);
  readonly ocrError = signal<string | null>(null);
  readonly verdict = signal<string | null>(null);
  readonly fieldCount = signal(0);

  private stream: MediaStream | null = null;
  private videoRef?: ElementRef<HTMLVideoElement>;

  // Le <video> est rendu conditionnellement : ce setter câble le flux dès que
  // l'élément apparaît dans le DOM (compatible zoneless / OnPush).
  @ViewChild('video') set video(ref: ElementRef<HTMLVideoElement> | undefined) {
    this.videoRef = ref;
    if (ref && this.stream) {
      ref.nativeElement.srcObject = this.stream;
      ref.nativeElement.play?.().catch(() => {});
    }
  }
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  async startCamera(): Promise<void> {
    this.camError.set(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      this.camError.set(
        "Caméra non disponible sur ce navigateur/origine. Utilisez « Importer un fichier ».",
      );
      return;
    }
    this.starting.set(true);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      this.streaming.set(true); // rend le <video> → le setter câble srcObject
    } catch {
      this.camError.set(
        "Caméra indisponible (autorisation refusée ou origine non sécurisée). Utilisez « Importer un fichier ».",
      );
    } finally {
      this.starting.set(false);
    }
  }

  capture(): void {
    const v = this.videoRef?.nativeElement;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    this.stopCamera();
    this.preview.set(canvas.toDataURL('image/jpeg', 0.9));
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `${this.documentType.toLowerCase()}.jpg`, {
          type: 'image/jpeg',
        });
        this.runOcr(file);
      },
      'image/jpeg',
      0.9,
    );
  }

  openFilePicker(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileChosen(e: Event): void {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = ''; // autorise la re-sélection du même fichier
    if (!f) return;
    this.stopCamera();
    const reader = new FileReader();
    reader.onload = () => this.preview.set(reader.result as string);
    reader.readAsDataURL(f);
    this.runOcr(f);
  }

  retake(): void {
    this.preview.set(null);
    this.done.set(false);
    this.ocrError.set(null);
    this.verdict.set(null);
    this.fieldCount.set(0);
    this.camError.set(null);
  }

  cancelCamera(): void {
    this.stopCamera();
  }

  private runOcr(file: File): void {
    // La photo est conservée pour l'upload ultérieur, quel que soit le sort de l'OCR.
    this.fileSelected.emit(file);
    this.done.set(false);
    this.ocrError.set(null);
    this.verdict.set(null);
    this.fieldCount.set(0);
    this.loading.set(true);
    this.api.ocr(file, this.documentType, this.accountType, this.sessionId).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.done.set(true);
        const fields = res?.extracted_fields ?? {};
        this.fieldCount.set(
          Object.keys(fields).filter((k) => k !== 'possible_dates').length,
        );
        this.verdict.set(
          res?.quality?.verdict ?? res?.document_type_validation_status ?? null,
        );
        this.ocrResult.emit(res);
        this.extracted.emit(fields);
      },
      error: () => {
        this.loading.set(false);
        this.ocrError.set(
          'Lecture automatique impossible. Saisissez les champs manuellement — la photo reste jointe au dossier.',
        );
      },
    });
  }

  private stopCamera(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.streaming.set(false);
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}
