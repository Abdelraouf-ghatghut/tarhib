# Police Thmanyah

Police principale du produit (CLAUDE.md §18). Elle n'est **pas incluse** dans
le repo : le téléchargement se fait sur <https://font.thmanyah.com/> (formulaire
avec e-mail — gratuit pour usage personnel et commercial).

## Installation

1. Télécharger le pack sur <https://font.thmanyah.com/> (« تحميل الخط »).
2. Déposer les fichiers `.woff2` dans ce dossier avec les noms d'origine
   du pack (déclarés dans `src/styles/fonts.css`) :

   - `thmanyahsans-Light.woff2` (300)
   - `thmanyahsans-Regular.woff2` (400)
   - `thmanyahsans-Medium.woff2` (500)
   - `thmanyahsans-Bold.woff2` (600–700 — les titres en 600 utilisent Bold,
     le pack ne fournit pas de SemiBold)
   - `thmanyahsans-Black.woff2` (800–900)

3. Recharger l'app — les `@font-face` de `src/styles/fonts.css` les prennent
   automatiquement. Tant que les fichiers sont absents, l'app retombe sur
   Cairo (arabe) / Inter (latin) sans erreur.

## Contraintes de licence (CLAUDE.md §18)

- ne pas redistribuer
- ne pas modifier
- ne pas permettre l'extraction
- ne pas vendre séparément

C'est pour cela que les fichiers ne sont pas commités : si l'équipe décide
que le repo privé compte comme usage interne (interprétation habituelle),
retirer la ligne correspondante du `.gitignore` et commiter les fichiers.
