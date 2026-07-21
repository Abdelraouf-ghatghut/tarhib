/** Mois courant au format 'YYYY-MM', utilisé comme clé de paie. */
export function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Montant de salaire dû pour `period` ('YYYY-MM'), en tenant compte de
 * `hireDate` (date de prise de fonction, 'YYYY-MM-DD' ou null) :
 * - hireDate null ou antérieure au mois de `period` → montant plein.
 * - hireDate dans le mois de `period` → proratisé au nombre de jours
 *   travaillés (mois d'embauche partiel), arrondi à 2 décimales.
 * - hireDate postérieure au mois de `period` → l'employé n'était pas encore
 *   en poste, retourne null (aucune ligne à générer).
 */
export function computeProratedSalary(
  salary: number,
  hireDate: string | null,
  period: string,
): number | null {
  if (!hireDate) return salary;

  const hireYearMonth = hireDate.slice(0, 7);
  if (hireYearMonth > period) return null;
  if (hireYearMonth < period) return salary;

  const [year, month] = period.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const hireDay = Number(hireDate.slice(8, 10));
  const daysWorked = daysInMonth - hireDay + 1;
  return Math.round(salary * (daysWorked / daysInMonth) * 100) / 100;
}
