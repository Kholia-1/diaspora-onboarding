import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OnbSectionCard } from '../ui/section-card';
import { OnbFormField, OnbInput } from '../ui/form-field';
import { DiasporaApi } from '../core/diaspora-api.service';

/** Suivi de dossier — visuel digital-onboarding (beige, serif, rouge). */
@Component({
  selector: 'diaspora-status',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [JsonPipe, RouterLink, OnbSectionCard, OnbFormField, OnbInput],
  template: `
    <div style="min-height:100vh;background:#F7F2EC;font-family:'Inter',system-ui,sans-serif;">
      <header style="border-bottom:1px solid rgba(20,20,30,0.10);">
        <div style="max-width:640px;margin:0 auto;padding:16px 20px;">
          <a routerLink="/home" style="text-decoration:none;display:flex;align-items:center;gap:10px;">
            <span style="display:inline-flex;width:30px;height:30px;border-radius:7px;background:#C8102E;color:#fff;align-items:center;justify-content:center;font-weight:700;">A</span>
            <span style="font-family:'Source Serif 4',Georgia,serif;font-size:16px;color:#151821;">Compte Diaspora</span>
          </a>
        </div>
      </header>

      <main style="max-width:640px;margin:0 auto;padding:32px 20px 60px;">
        <onb-section-card [section]="1" title="Suivre ma demande" subtitle="Saisissez la référence de votre dossier.">
          <onb-form-field label="Référence du dossier">
            <input onbInput type="text" [value]="reference" (input)="reference = $any($event.target).value" placeholder="ex. AFR-XXXXXX" />
          </onb-form-field>
          <div style="margin-top:16px;">
            <button type="button" (click)="lookup()" [disabled]="loading()"
              [style.background]="loading() ? '#ccc' : '#C8102E'"
              style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;color:#fff;border:none;font-size:12px;font-weight:600;letter-spacing:1.3px;text-transform:uppercase;cursor:pointer;">
              {{ loading() ? 'Recherche…' : 'Rechercher' }}
            </button>
          </div>
          @if (result()) {
            <pre style="margin-top:16px;background:#F7F2EC;border:1px solid rgba(20,20,30,0.08);border-radius:8px;padding:12px;font-size:11.5px;overflow:auto;color:#151821;">{{ result() | json }}</pre>

            <!-- Paiement du package : proposé uniquement quand le dossier est approuvé
                 (l'API renvoie 403 tant que la banque n'a pas validé). -->
            @if (canPay()) {
              <div style="margin-top:16px;">
                <button type="button" (click)="pay()" [disabled]="paying()"
                  [style.background]="paying() ? '#ccc' : '#0F7B3E'"
                  style="display:inline-flex;align-items:center;gap:8px;padding:12px 28px;color:#fff;border:none;font-size:12px;font-weight:600;letter-spacing:1.3px;text-transform:uppercase;cursor:pointer;">
                  {{ paying() ? 'Redirection…' : 'Payer mon package' }}
                </button>
              </div>
            }
            @if (payMessage()) { <p style="font-size:12px;color:#151821;margin-top:12px;">{{ payMessage() }}</p> }
          }
          @if (error()) { <p style="font-size:12px;color:#C8102E;margin-top:12px;">{{ error() }}</p> }
        </onb-section-card>
      </main>
    </div>
  `,
})
export class DiasporaStatusPage {
  private api = inject(DiasporaApi);
  private route = inject(ActivatedRoute);
  reference = this.route.snapshot.queryParamMap.get('reference') ?? '';
  readonly loading = signal(false);
  readonly result = signal<unknown>(null);
  readonly error = signal<string | null>(null);
  readonly paying = signal(false);
  readonly payMessage = signal<string | null>(null);

  /** Statuts où le client peut lancer le paiement du package (dossier validé, non payé). */
  private static readonly PAYABLE = new Set(['APPROVED', 'APPROVED_PENDING_PAYMENT', 'PAYMENT_PENDING']);

  canPay(): boolean {
    const status = String((this.result() as { status?: string } | null)?.status ?? '').toUpperCase();
    return DiasporaStatusPage.PAYABLE.has(status);
  }

  lookup(): void {
    if (!this.reference) return;
    this.loading.set(true);
    this.error.set(null);
    this.payMessage.set(null);
    this.api.statusByReference(this.reference).subscribe({
      next: (r) => { this.result.set(r); this.loading.set(false); },
      error: () => { this.error.set('Dossier introuvable.'); this.loading.set(false); },
    });
  }

  pay(): void {
    if (!this.reference || this.paying()) return;
    this.paying.set(true);
    this.payMessage.set(null);
    this.api.initiatePackagePayment(this.reference).subscribe({
      next: (r) => {
        this.paying.set(false);
        const res = r as {
          payment_required?: boolean;
          message?: string;
          payment?: { payment_url?: string; full_payment_url?: string };
        };
        if (res?.payment_required === false) {
          this.payMessage.set('Aucun paiement n’est requis pour ce package.');
          return;
        }
        const url = res?.payment?.full_payment_url ?? res?.payment?.payment_url;
        if (url) {
          // Redirection vers la page de paiement (Mastercard hosted checkout).
          window.location.href = new URL(url, window.location.origin).toString();
        } else {
          this.payMessage.set(res?.message ?? 'Le lien de paiement n’a pas pu être créé.');
        }
      },
      error: (e: { status?: number }) => {
        this.paying.set(false);
        this.payMessage.set(
          e?.status === 403
            ? 'Le paiement sera disponible après validation de votre dossier par la banque.'
            : e?.status === 404
              ? 'Dossier introuvable.'
              : 'Impossible d’initier le paiement pour le moment.',
        );
      },
    });
  }
}
