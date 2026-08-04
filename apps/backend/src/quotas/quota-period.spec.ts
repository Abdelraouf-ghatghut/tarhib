import { computeQuotaPeriod } from './quota-period';

const dow = (ymd: string): number => new Date(`${ymd}T12:00:00Z`).getUTCDay();

describe('computeQuotaPeriod (D4 — Africa/Tripoli, semaine dim→dim)', () => {
  it('DAILY : période = la date locale, un seul jour', () => {
    const p = computeQuotaPeriod('DAILY', new Date('2026-08-04T09:00:00Z'));
    expect(p).toEqual({ periodStart: '2026-08-04', periodEnd: '2026-08-04' });
  });

  it('bascule de fuseau : 22:30Z tombe le lendemain à Tripoli (UTC+2)', () => {
    // 2026-08-04T22:30Z = 2026-08-05T00:30 heure locale Libye
    const p = computeQuotaPeriod('DAILY', new Date('2026-08-04T22:30:00Z'));
    expect(p.periodStart).toBe('2026-08-05');
  });

  it('WEEKLY : fenêtre continue dimanche→samedi contenant la date', () => {
    const at = new Date('2026-08-04T09:00:00Z'); // un mardi
    const p = computeQuotaPeriod('WEEKLY', at);
    expect(dow(p.periodStart)).toBe(0); // début = dimanche
    expect(dow(p.periodEnd)).toBe(6); // fin = samedi
    // 6 jours d'écart
    const start = new Date(`${p.periodStart}T12:00:00Z`);
    const end = new Date(`${p.periodEnd}T12:00:00Z`);
    expect((end.getTime() - start.getTime()) / 86_400_000).toBe(6);
    // la date locale est bien dans la fenêtre
    expect(p.periodStart <= '2026-08-04' && '2026-08-04' <= p.periodEnd).toBe(
      true,
    );
  });

  it('WEEKLY : un dimanche est son propre début de semaine', () => {
    const p = computeQuotaPeriod('WEEKLY', new Date('2026-08-02T09:00:00Z'));
    expect(dow(p.periodStart)).toBe(0);
    expect('2026-08-02' >= p.periodStart && '2026-08-02' <= p.periodEnd).toBe(
      true,
    );
  });

  it('MONTHLY : du 1er au dernier jour du mois local', () => {
    const p = computeQuotaPeriod('MONTHLY', new Date('2026-08-04T09:00:00Z'));
    expect(p).toEqual({ periodStart: '2026-08-01', periodEnd: '2026-08-31' });
  });

  it('MONTHLY : février non bissextile', () => {
    const p = computeQuotaPeriod('MONTHLY', new Date('2026-02-15T09:00:00Z'));
    expect(p).toEqual({ periodStart: '2026-02-01', periodEnd: '2026-02-28' });
  });
});
