import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', loadComponent: () => import('./pages/home').then((m) => m.DiasporaHomePage) },
  // « Créer un compte » : on privilégie le parcours client réel de ce dépôt (legacy :8010,
  // caméra/OCR complet), affiché en iframe sans changer de port. L'ancien formulaire Angular
  // reste disponible sur /onboarding-form si besoin de comparaison.
  { path: 'onboarding', loadComponent: () => import('./pages/legacy-onboarding').then((m) => m.DiasporaLegacyOnboardingPage) },
  { path: 'onboarding-form', loadComponent: () => import('./pages/onboarding').then((m) => m.DiasporaOnboardingPage) },
  { path: 'status', loadComponent: () => import('./pages/status').then((m) => m.DiasporaStatusPage) },
  { path: '**', redirectTo: 'home' },
];
