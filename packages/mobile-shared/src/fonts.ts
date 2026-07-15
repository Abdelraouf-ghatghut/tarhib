import { Asset } from "expo-asset";
import { Platform } from "react-native";

import thmanyahBlack from "../assets/fonts/thmanyahsans-Black.woff2";
import thmanyahBold from "../assets/fonts/thmanyahsans-Bold.woff2";
import thmanyahMedium from "../assets/fonts/thmanyahsans-Medium.woff2";
import thmanyahRegular from "../assets/fonts/thmanyahsans-Regular.woff2";

// Mêmes graisses que apps/web-admin/src/styles/fonts.css : Bold couvre
// 600-700, Black couvre 800-900 (pas de SemiBold dans le pack).
const FACES: Array<{ source: number; weight: string }> = [
  { source: thmanyahRegular, weight: "400" },
  { source: thmanyahMedium, weight: "500 600" },
  { source: thmanyahBold, weight: "700" },
  { source: thmanyahBlack, weight: "800 900" },
];

let registered = false;

/**
 * Thmanyah (police produit, CLAUDE.md §18) n'est fournie qu'en woff2, format
 * que seul le web sait charger : enregistrement via l'API FontFace. Sur
 * iOS/Android la police système reste en place (voir productFontFamily dans
 * ./theme) tant qu'un pack ttf/otf sous licence n'existe pas.
 * À appeler au chargement du module App de chaque application.
 */
export function registerThmanyahFonts(): void {
  if (
    registered ||
    Platform.OS !== "web" ||
    typeof document === "undefined" ||
    typeof FontFace === "undefined"
  ) {
    return;
  }
  registered = true;
  for (const face of FACES) {
    try {
      const uri = Asset.fromModule(face.source).uri;
      const fontFace = new FontFace("Thmanyah", `url(${uri})`, { weight: face.weight });
      // La lib DOM de TS ne déclare pas FontFaceSet.add alors que tous les
      // navigateurs le supportent.
      (document.fonts as unknown as { add(font: FontFace): void }).add(fontFace);
      void fontFace.load();
    } catch {
      // Chargement best-effort : la pile de secours système prend le relais.
    }
  }
}
