import {
  Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges,
} from '@angular/core';
import {
  CountryCode, formatIncompletePhoneNumber, getCountries, getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';

/** Emoji drapeau depuis un code pays ISO 2 lettres (regional-indicator symbols). */
const flagEmoji = (iso: string) =>
  iso.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

interface CountryOption { iso: CountryCode; name: string; dial: string; flag: string; }

/** Liste des pays (drapeau · nom FR · indicatif), triée par nom. */
function buildCountries(): CountryOption[] {
  let namer: Intl.DisplayNames | null = null;
  try { namer = new Intl.DisplayNames(['fr'], { type: 'region' }); } catch { namer = null; }
  return getCountries()
    .map((iso) => ({ iso, dial: getCountryCallingCode(iso), flag: flagEmoji(iso), name: namer?.of(iso) ?? iso }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/**
 * Saisie de téléphone internationale : sélecteur de pays (drapeau + indicatif) +
 * numéro national. Émet la chaîne E.164 complète (ex. « +237699000000 »). Le format
 * et la longueur maximale du numéro national suivent le pays choisi (libphonenumber-js),
 * garantissant la cohérence indicatif ↔ numéro. Défaut : Cameroun. Style aligné sur
 * l'onboarding (accent rouge #C8102E).
 */
@Component({
  selector: 'onb-phone-field',
  standalone: true,
  template: `
    <div style="position:relative;">
      <div [style]="wrapStyle">
        <button type="button" (click)="toggleOpen($event)" [attr.aria-expanded]="open"
          aria-label="Indicatif pays"
          style="display:flex;align-items:center;gap:5px;padding:0 10px;border:none;border-right:1px solid rgba(20,20,30,0.14);background:#F7F2EC;cursor:pointer;font-size:13px;color:#151821;white-space:nowrap;font-family:'Inter',system-ui,sans-serif;">
          <span style="font-size:15px;line-height:1;">{{ selectedFlag }}</span>
          <span>+{{ dial }}</span>
          <span style="opacity:.55;font-size:10px;">▾</span>
        </button>
        <input inputmode="tel" [placeholder]="placeholder"
          [value]="displayNational" (input)="onInput($event)"
          style="flex:1;min-width:0;border:none;outline:none;padding:10px 12px;font-size:13.5px;color:#151821;background:transparent;font-family:'Inter',system-ui,sans-serif;" />
      </div>
      @if (open) {
        <div (click)="$event.stopPropagation()"
          style="position:absolute;z-index:30;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1px solid rgba(20,20,30,0.14);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);overflow:hidden;">
          <input placeholder="Rechercher un pays…" [value]="filter"
            (input)="filter = $any($event.target).value" autofocus
            style="width:100%;box-sizing:border-box;padding:9px 12px;border:none;border-bottom:1px solid rgba(20,20,30,0.08);outline:none;font-size:13px;font-family:'Inter',system-ui,sans-serif;" />
          <div style="max-height:220px;overflow-y:auto;">
            @for (c of filteredCountries; track c.iso) {
              <button type="button" (click)="choose(c.iso)"
                [style.background]="c.iso === country ? 'rgba(200,16,46,0.06)' : '#fff'"
                style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border:none;cursor:pointer;font-size:13px;color:#151821;text-align:left;font-family:'Inter',system-ui,sans-serif;">
                <span style="font-size:15px;line-height:1;">{{ c.flag }}</span>
                <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ c.name }}</span>
                <span style="opacity:.55;">+{{ c.dial }}</span>
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class OnbPhoneField implements OnChanges {
  @Input() value = '';
  @Input() defaultCountry: CountryCode = 'CM';
  @Input() hasError = false;
  @Input() changeFn?: (v: string) => void;
  @Output() valueChange = new EventEmitter<string>();

  countries = buildCountries();
  country: CountryCode = 'CM';
  national = '';
  open = false;
  filter = '';
  private lastEmitted = '';

  get dial() { return getCountryCallingCode(this.country); }
  get selectedFlag() { return flagEmoji(this.country); }
  get placeholder() { return this.country === 'CM' ? '6 99 00 00 00' : '000 000 000'; }
  /** Longueur max du numéro national (E.164 : 15 chiffres moins l'indicatif). */
  get maxLen() { return Math.max(6, 15 - this.dial.length); }
  /** Numéro national groupé au format local du pays, pour l'affichage (ex. « 6 99 00 00 00 »). */
  get displayNational() {
    if (!this.national) return '';
    try { return formatIncompletePhoneNumber(this.national, this.country); }
    catch { return this.national; }
  }
  get wrapStyle() {
    const border = this.hasError ? 'rgba(200,16,46,0.4)' : 'rgba(20,20,30,0.14)';
    const bg = this.hasError ? 'rgba(200,16,46,0.03)' : '#FFFFFF';
    return `display:flex;align-items:stretch;overflow:hidden;box-sizing:border-box;`
      + `border:1px solid ${border};border-radius:8px;background:${bg};`;
  }
  get filteredCountries(): CountryOption[] {
    const q = this.filter.trim().toLowerCase();
    if (!q) return this.countries;
    return this.countries.filter((c) =>
      c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.iso.toLowerCase().includes(q));
  }

  ngOnChanges(ch: SimpleChanges) {
    if (ch['defaultCountry'] && !this.value) this.country = this.defaultCountry;
    if (ch['value'] && this.value !== this.lastEmitted) this.parse(this.value);
  }

  /** Rétro-remplit pays + numéro national à partir d'une valeur E.164 existante. */
  private parse(v: string) {
    if (!v) { this.national = ''; return; }
    const p = parsePhoneNumberFromString(v);
    if (p) { if (p.country) this.country = p.country; this.national = p.nationalNumber as string; }
    else { this.national = v.replace(/\D/g, ''); }
  }

  toggleOpen(e: Event) { e.stopPropagation(); this.open = !this.open; this.filter = ''; }
  choose(iso: string) { this.country = iso as CountryCode; this.open = false; this.filter = ''; this.emit(); }

  @HostListener('document:click')
  closeMenu() { this.open = false; }

  onInput(e: Event) {
    this.national = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, this.maxLen);
    this.emit();
  }

  private emit() {
    const v = this.national ? '+' + getCountryCallingCode(this.country) + this.national : '';
    this.lastEmitted = v;
    this.value = v;
    this.changeFn?.(v);
    this.valueChange.emit(v);
  }
}
