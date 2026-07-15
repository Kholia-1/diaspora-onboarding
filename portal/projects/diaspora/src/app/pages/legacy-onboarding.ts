import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Parcours d'ouverture de compte = le PARCOURS CLIENT RÉEL de ce dépôt (legacy :8010,
 * client_open_account_flow_test.html) avec toute la capture caméra/OCR (OpenCV/MediaPipe).
 *
 * Affiché en iframe : la barre d'adresse ne change pas. Le parcours legacy est autonome
 * (il parle à son propre backend :8010).
 *
 * URL cible, par ordre de priorité :
 *   1. window.__LEGACY_ONBOARDING_URL__ (surcharge runtime explicite) ;
 *   2. en dev (portail servi depuis localhost/127.0.0.1) : le :8010 LOCAL de la machine ;
 *   3. sinon (déployé, ex. onboardingv2) : l'URL PUBLIQUE du parcours legacy, joignable
 *      depuis un mobile. « localhost » côté mobile = le téléphone lui-même → jamais utilisable.
 */
const LOCAL_LEGACY_URL = 'http://localhost:8010/open-account-flow-test';
const PUBLIC_LEGACY_URL = 'https://onboarding.afb-firstagent.com/open-account-flow-test';

function resolveLegacyUrl(): string {
  const g = globalThis as unknown as {
    __LEGACY_ONBOARDING_URL__?: string;
    location?: { hostname?: string };
  };
  const override = g.__LEGACY_ONBOARDING_URL__;
  if (override && override.trim()) return override;
  const host = g.location?.hostname || '';
  if (host === 'localhost' || host === '127.0.0.1') return LOCAL_LEGACY_URL;
  return PUBLIC_LEGACY_URL;
}

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
    this.url = sanitizer.bypassSecurityTrustResourceUrl(resolveLegacyUrl());
  }
}
