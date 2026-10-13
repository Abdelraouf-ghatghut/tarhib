import { PeriodeQuota } from '@prisma/client';

/** Début (UTC) de la période de quota contenant `reference`. Semaine = lundi. */
export function calculerDebutPeriode(
  periode: PeriodeQuota,
  reference: Date,
): Date {
  const annee = reference.getUTCFullYear();
  const mois = reference.getUTCMonth();
  const jour = reference.getUTCDate();

  if (periode === 'jour') {
    return new Date(Date.UTC(annee, mois, jour));
  }
  if (periode === 'mois') {
    return new Date(Date.UTC(annee, mois, 1));
  }
  // semaine : la période débute le lundi
  const jourSemaine = reference.getUTCDay(); // 0 = dimanche
  const decalageDepuisLundi = (jourSemaine + 6) % 7;
  return new Date(Date.UTC(annee, mois, jour - decalageDepuisLundi));
}

/** Fin (UTC, incluse) de la période de quota qui débute à `debut`. */
export function calculerFinPeriode(periode: PeriodeQuota, debut: Date): Date {
  const annee = debut.getUTCFullYear();
  const mois = debut.getUTCMonth();
  const jour = debut.getUTCDate();

  if (periode === 'jour') {
    return new Date(Date.UTC(annee, mois, jour));
  }
  if (periode === 'mois') {
    return new Date(Date.UTC(annee, mois + 1, 0));
  }
  return new Date(Date.UTC(annee, mois, jour + 6));
}
