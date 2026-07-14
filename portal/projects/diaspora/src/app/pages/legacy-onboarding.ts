import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Parcours d'ouverture de compte = le PARCOURS CLIENT RÉEL de ce dépôt (legacy :8010,
 * client_open_account_flow_test.html) avec toute la capture caméra/OCR (OpenCV/MediaPipe).
 *
 * Affiché en iframe : l'utilisateur reste sur l'origine du portail (« sans changer de port »),
 * la barre d'adresse ne change pas. Le parcours legacy est autonome (il parle à son propre
 * backend :8010). En PROD : pointer LEGACY_ONBOARDING_URL vers le chemin legacy servi sur le
 * même domaine par le reverse proxy (ex. /open-account-flow-test).
 */
const LEGACY_ONBOARDING_URL = 'http://localhost:8010/open-account-flow-test';

@Component({
  selector: 'onb-legacy-onboarding',
  standalone: true,
  template: `
    <iframe
      class="legacy-frame"
      [src]="url"
      title="Ouverture de compte à distance"
      allow="camera; microphone; geolocation; fullscreen"
      referrerpolicy="no-referrer-when-downgrade"></iframe>
  `,
  styles: [`
    :host { display:block; }
    .legacy-frame {
      display:block;
      border:0;
      width:100%;
      /* Grande zone : le parcours legacy gère son propre défilement interne. */
      height:100vh;
      min-height:85vh;
    }
  `],
})
export class DiasporaLegacyOnboardingPage {
  readonly url: SafeResourceUrl;

  constructor(sanitizer: DomSanitizer) {
    this.url = sanitizer.bypassSecurityTrustResourceUrl(LEGACY_ONBOARDING_URL);
  }
}
