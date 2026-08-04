/**
 * Calcul des fenêtres de période de quota (D4).
 *
 * Fuseau métier : Africa/Tripoli. Semaine de quota CONTINUE dimanche→dimanche
 * (jours ouvrés dim→jeu = information, pas la fenêtre). Jamais de calcul UTC :
 * la date métier est la date LOCALE Libye au moment `at`.
 *
 * Retourne des bornes `YYYY-MM-DD` alignées EXACTEMENT sur la contrainte unique
 * de employee_quota_usage (employee_id, product_id, company_id, period_start,
 * period_end) — cible du ON CONFLICT côté OrdersService.
 */
export type QuotaPeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

const BUSINESS_TZ = 'Africa/Tripoli';

/** Date locale (Africa/Tripoli) de `at`, en 'YYYY-MM-DD'. Intl gère le fuseau. */
function localYmd(at: Date): string {
  // 'en-CA' formate en 'YYYY-MM-DD'.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** Construit un Date UTC à midi pour une date calendaire — évite les bascules de jour. */
function utcNoon(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function fmt(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface QuotaPeriod {
  periodStart: string; // YYYY-MM-DD inclus
  periodEnd: string; // YYYY-MM-DD inclus
}

export function computeQuotaPeriod(
  // accepte le varchar de role_quotas.period_type (l'enum aval s'y assigne sans
  // cast) ; toute valeur inconnue retombe sur MONTHLY.
  periodType: string,
  at: Date,
): QuotaPeriod {
  const [y, m, d] = localYmd(at).split('-').map(Number);

  if (periodType === 'DAILY') {
    const day = fmt(utcNoon(y, m, d));
    return { periodStart: day, periodEnd: day };
  }

  if (periodType === 'WEEKLY') {
    const base = utcNoon(y, m, d);
    const dow = base.getUTCDay(); // 0 = dimanche
    const start = new Date(base);
    start.setUTCDate(base.getUTCDate() - dow); // recule au dimanche
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6); // samedi
    return { periodStart: fmt(start), periodEnd: fmt(end) };
  }

  // MONTHLY
  const start = utcNoon(y, m, 1);
  const end = utcNoon(y, m + 1, 0); // jour 0 du mois suivant = dernier jour du mois
  return { periodStart: fmt(start), periodEnd: fmt(end) };
}
