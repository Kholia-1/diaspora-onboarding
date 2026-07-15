import {
  Component, ElementRef, Input, ViewChild, inject, signal,
  ChangeDetectionStrategy, OnDestroy, EventEmitter, Output,
} from '@angular/core';
import { DiasporaApi, FaceVerifyResult } from '../core/diaspora-api.service';

/**
 * Vérification faciale KYC (liveness) : capture un court selfie vidéo + une photo,
 * et les compare à la photo de la CNI (déjà capturée à l'étape pièce d'identité)
 * via POST /api/pre-onboarding/face-verify (backend Spring -> microservice ArcFace).
 *
 * Caméra FRONTALE (facingMode 'user'). Origine sécurisée requise (https / localhost).
 * Non bloquant : si la caméra est indisponible ou le service down, le message le dit
 * et le parcours peut continuer (le verdict est indicatif à ce stade).
 */
@Component({
  selector: 'onb-face-verify',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .fv-spin { width:18px;height:18px;border-radius:50%;
      border:2.4px solid rgba(200,16,46,0.25);border-top-color:#C8102E;animation:fv-spin .7s linear infinite; }
    @keyframes fv-spin { to { transform: rotate(360deg); } }
    .fv-rec { width:9px;height:9px;border-radius:50%;background:#C8102E;animation:fv-blink 1s steps(2) infinite; }
    @keyframes fv-blink { 50% { opacity:.25; } }
  `],
  template: `
    <div style="background:#FFFFFF;border:1px solid rgba(20,20,30,0.12);border-radius:12px;padding:22px 24px;margin-bottom:16px;font-family:'Inter',system-ui,sans-serif;">
      <div style="margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid rgba(20,20,30,0.08);">
        <div style="font-size:9.5px;font-weight:700;letter-spacing:1.6px;color:#C8102E;text-transform:uppercase;margin-bottom:5px;">
          Vérification d'identité (liveness)
        </div>
        <div style="font-family:'Source Serif 4',Georgia,serif;font-size:17px;font-weight:500;color:#151821;letter-spacing:-0.3px;">
          Confirmez que c'est bien vous
        </div>
        <div style="font-size:12px;color:#6B7280;margin-top:4px;line-height:1.5;">
          Regardez la caméra frontale et lancez un court enregistrement. Nous comparons votre visage à la photo de votre pièce d'identité.
        </div>
      </div>

      @if (!cniFile) {
        <p style="font-size:12.5px;color:#B45309;background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:10px 12px;margin:0;line-height:1.5;">
          Capturez d'abord votre pièce d'identité (ci-dessus) : sa photo sert de référence.
        </p>
      } @else {
        @if (result(); as r) {
          <!-- Verdict -->
          <div [style.background]="r.match ? '#E7F7EC' : '#FDECEC'"
               [style.border]="'1px solid ' + (r.match ? '#B7E4C7' : '#F5C2C2')"
               style="border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;align-items:center;gap:10px;">
              @if (r.match) {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 L9 17 L4 12"/></svg>
                <span style="font-weight:700;color:#166534;font-size:14px;">Identité confirmée</span>
              } @else {
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B5121B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 L6 18"/><path d="M6 6 L18 18"/></svg>
                <span style="font-weight:700;color:#B5121B;font-size:14px;">Vérification non concluante</span>
              }
            </div>
            <div style="font-size:12px;color:#4B5563;line-height:1.5;">{{ verdictHint(r) }}</div>
          </div>
          <div style="margin-top:14px;">
            <button type="button" (click)="reset()"
              style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border:1px solid rgba(20,20,30,0.14);background:#fff;font-size:13px;font-weight:500;color:#151821;cursor:pointer;border-radius:8px;">
              Recommencer
            </button>
          </div>
        } @else {
          <div style="display:flex;flex-direction:column;align-items:center;gap:14px;">
            <div style="position:relative;width:100%;max-width:360px;aspect-ratio:3 / 4;border-radius:12px;overflow:hidden;background:#0e1116;">
              <!-- Miroir pour la caméra frontale -->
              <video #video autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;transform:scaleX(-1);"></video>
              <span style="position:absolute;inset:14px;border:2px dashed rgba(255,255,255,0.5);border-radius:50%;pointer-events:none;"></span>
              @if (recording()) {
                <div style="position:absolute;top:12px;left:12px;display:flex;align-items:center;gap:7px;background:rgba(0,0,0,0.45);padding:5px 10px;border-radius:20px;">
                  <span class="fv-rec"></span><span style="color:#fff;font-size:11px;font-weight:600;">Enregistrement…</span>
                </div>
              }
            </div>

            @if (verifying()) {
              <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:#6B7280;">
                <span class="fv-spin"></span><span>Analyse en cours…</span>
              </div>
            } @else if (streaming()) {
              <button type="button" (click)="record()" [disabled]="recording()"
                [style.opacity]="recording() ? '0.6' : '1'"
                style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;color:#fff;background:#C8102E;border:none;font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;cursor:pointer;border-radius:8px;">
                {{ recording() ? 'Ne bougez pas…' : 'Lancer la vérification' }}
              </button>
            } @else {
              <button type="button" (click)="startCamera()" [disabled]="starting()"
                [style.opacity]="starting() ? '0.6' : '1'"
                style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;color:#fff;background:#C8102E;border:none;font-size:12px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;cursor:pointer;border-radius:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                {{ starting() ? 'Ouverture…' : 'Activer la caméra' }}
              </button>
            }
            @if (error()) { <p style="font-size:12px;color:#C8102E;margin:0;text-align:center;max-width:340px;line-height:1.5;">{{ error() }}</p> }
          </div>
        }
      }
    </div>
  `,
})
export class OnbFaceVerify implements OnDestroy {
  private api = inject(DiasporaApi);

  /** Photo de la CNI (recto) capturée à l'étape pièce d'identité — sert de référence. */
  @Input() cniFile: File | null = null;
  /** Émet le résultat pour que le parcours puisse en tenir compte. */
  @Output() verified = new EventEmitter<FaceVerifyResult>();

  readonly starting = signal(false);
  readonly streaming = signal(false);
  readonly recording = signal(false);
  readonly verifying = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<FaceVerifyResult | null>(null);

  private stream: MediaStream | null = null;
  private videoRef?: ElementRef<HTMLVideoElement>;

  @ViewChild('video') set video(ref: ElementRef<HTMLVideoElement> | undefined) {
    this.videoRef = ref;
    if (ref && this.stream) {
      ref.nativeElement.srcObject = this.stream;
      ref.nativeElement.play?.().catch(() => {});
    }
  }

  async startCamera(): Promise<void> {
    this.error.set(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      this.error.set('Caméra non disponible sur ce navigateur/origine.');
      return;
    }
    this.starting.set(true);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'user' } },
        audio: false,
      });
      this.streaming.set(true);
    } catch {
      this.error.set('Caméra indisponible (autorisation refusée ou origine non sécurisée).');
    } finally {
      this.starting.set(false);
    }
  }

  record(): void {
    const v = this.videoRef?.nativeElement;
    if (!this.stream || !v || this.recording()) return;
    this.error.set(null);

    const mime = ['video/webm;codecs=vp8', 'video/webm', 'video/mp4']
      .find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) || '';
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    } catch {
      this.error.set('Enregistrement vidéo non supporté par ce navigateur.');
      return;
    }

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      const videoBlob = new Blob(chunks, { type: mime || 'video/webm' });
      const videoFile = new File([videoBlob], 'liveness.webm', { type: videoBlob.type });
      const selfie = this.snapshot();
      this.stopCamera();
      this.submit(videoFile, selfie);
    };

    this.recording.set(true);
    recorder.start();
    // Selfie à mi-parcours, puis arrêt après ~3 s.
    setTimeout(() => { this.selfieBlob = this.snapshot(); }, 1600);
    setTimeout(() => { try { recorder.state !== 'inactive' && recorder.stop(); } catch { /* ignore */ } }, 3200);
  }

  private selfieBlob: File | null = null;

  private snapshot(): File {
    const v = this.videoRef?.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = v?.videoWidth || 480;
    canvas.height = v?.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (ctx && v) ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const bin = atob(dataUrl.split(',')[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], 'selfie.jpg', { type: 'image/jpeg' });
  }

  private submit(video: File, selfie: File): void {
    const chosenSelfie = this.selfieBlob || selfie;
    this.selfieBlob = null;
    this.verifying.set(true);
    this.api.verifyFace(video, chosenSelfie, this.cniFile).subscribe({
      next: (r) => {
        this.verifying.set(false);
        this.result.set(r);
        this.verified.emit(r);
      },
      error: () => {
        this.verifying.set(false);
        this.error.set('Vérification indisponible pour le moment. Vous pouvez continuer ; un contrôle sera fait par la banque.');
      },
    });
  }

  verdictHint(r: FaceVerifyResult): string {
    if (r.match) {
      const conf = typeof r.confidence === 'number' ? ` (marge ${r.confidence.toFixed(2)})` : '';
      return `Votre visage correspond à votre pièce d'identité${conf}.`;
    }
    const reasons = (r.reasons || []).join(', ');
    if (reasons.includes('NO_FACE_VIDEO')) return "Aucun visage détecté dans la vidéo. Reprenez face à la caméra, bien éclairé.";
    if (reasons.includes('NO_FACE_CNI')) return "Le visage de la pièce d'identité n'a pas pu être lu. Reprenez la photo de la pièce.";
    return "Le visage capturé ne correspond pas suffisamment à la pièce. Reprenez la vérification.";
  }

  reset(): void {
    this.result.set(null);
    this.error.set(null);
    this.selfieBlob = null;
  }

  private stopCamera(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.streaming.set(false);
    this.recording.set(false);
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}
