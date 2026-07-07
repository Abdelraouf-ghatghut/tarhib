/**
 * Nom bilingue à afficher : l'arabe en mode AR, l'anglais en mode EN — si
 * l'anglais n'est pas renseigné, on ne bascule jamais sur l'arabe (ça
 * induirait en erreur un utilisateur en interface anglaise), on affiche "-".
 */
export function bilingualName(
  nameAr: string,
  nameEn: string | null | undefined,
  isAr: boolean,
): string {
  if (isAr) return nameAr;
  return nameEn?.trim() ? nameEn : "-";
}
