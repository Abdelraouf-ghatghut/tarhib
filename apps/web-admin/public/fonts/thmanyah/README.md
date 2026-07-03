# Police Thmanyah

Police principale du produit (CLAUDE.md §18). Elle n'est **pas incluse** dans
le repo : le téléchargement se fait sur <https://font.thmanyah.com/> (formulaire
avec e-mail — gratuit pour usage personnel et commercial).

## Installation

1. Télécharger le pack sur <https://font.thmanyah.com/> (« تحميل الخط »).
2. Déposer les fichiers `.woff2` dans ce dossier avec ces noms exacts
   (renommer si besoin selon les graisses fournies) :

   - `Thmanyah-Regular.woff2` (400)
   - `Thmanyah-Medium.woff2` (500)
   - `Thmanyah-SemiBold.woff2` (600)
   - `Thmanyah-Bold.woff2` (700)

3. Recharger l'app — les `@font-face` de `src/styles/fonts.css` les prennent
   automatiquement. Tant que les fichiers sont absents, l'app retombe sur
   Cairo (arabe) / Inter (latin) sans erreur.

Si le pack ne contient que du TTF/OTF, convertir en WOFF2 n'est PAS autorisé
(« ne pas modifier ») : ajouter à la place des déclarations `src: url(...ttf)
format("truetype")` dans `fonts.css`.

## Contraintes de licence (CLAUDE.md §18)

- ne pas redistribuer
- ne pas modifier
- ne pas permettre l'extraction
- ne pas vendre séparément

C'est pour cela que les fichiers ne sont pas commités : si l'équipe décide
que le repo privé compte comme usage interne (interprétation habituelle),
retirer la ligne correspondante du `.gitignore` et commiter les fichiers.
