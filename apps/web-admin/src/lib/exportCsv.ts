interface CsvColumn<T> {
  label: string;
  value: (row: T) => string | number | null | undefined;
}

/** Échappe une cellule CSV (RFC 4180) — guillemets doublés si la valeur en contient, une virgule ou un saut de ligne. */
function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * Génère un CSV côté client et déclenche son téléchargement — pas de
 * dépendance, pas d'aller-retour serveur pour une simple extraction de la
 * page déjà chargée en mémoire.
 */
export function exportToCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvCell(String(c.value(row) ?? ""))).join(","),
  );
  // BOM UTF-8 : Excel affiche correctement l'arabe sans ça.
  const csv = "﻿" + [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
