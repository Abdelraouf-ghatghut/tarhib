/**
 * Thmanyah est une police sous licence et ses fichiers ne sont volontairement
 * ni versionnés ni intégrés aux bundles publics des applications.
 *
 * Le thème utilise une pile de polices système compatible avec l'arabe lorsque
 * Thmanyah n'est pas installée sur la plateforme. Cette fonction reste exposée
 * pour préserver l'API des deux applications jusqu'à la mise en place éventuelle
 * d'un canal de distribution explicitement autorisé par le détenteur des droits.
 */
export function registerThmanyahFonts(): void {
  // Aucun chargement embarqué : ne pas importer les fichiers de police ici.
}
