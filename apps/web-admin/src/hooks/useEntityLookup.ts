/**
 * Résolveur générique "id -> libellé bilingue" : remplace les fonctions
 * `productName`/`companyName`/`branchName`/`employeeName` copiées-collées
 * dans chaque page (même logique `.find(...) ?? id.slice(0,8)` partout).
 */
export function useEntityLookup<T>(
  list: T[] | undefined,
  getId: (item: T) => string,
  getLabel: (item: T) => string,
): {
  (id: string): string;
  (id: string | null | undefined): string | null;
} {
  return ((id: string | null | undefined) => {
    if (!id) return null;
    const item = list?.find((x) => getId(x) === id);
    return item ? getLabel(item) : id.slice(0, 8);
  }) as { (id: string): string; (id: string | null | undefined): string | null };
}
