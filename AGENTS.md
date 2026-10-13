# AGENTS.md — Contexte projet pour Codex

## Résumé du projet

Plateforme de gestion des services d'hospitalité en entreprise (commande de café/thé/plateaux etc. par les employés, préparation/livraison par les agents d'hospitalité). Cycle complet : authentification → catalogue → commande → validation automatique → préparation → livraison → mise à jour des stocks/quotas → audit/reporting.

**Marché de lancement : Libye.** Langues de l'application : **arabe (langue principale, RTL)** et **anglais (langue secondaire)**, sélectionnables par l'utilisateur. Devise de référence : Dinar libyen (LYD). Format téléphone à valider en `+218`.

**Règle d'architecture non négociable sur le bilinguisme** : le backend ne renvoie jamais de texte déjà traduit. Concrètement :
- Le catalogue (`produits`, `categories_produits`) stocke des colonnes `nom_ar`/`nom_en` (et `description_ar`/`description_en`) — l'API renvoie les deux, c'est l'app qui affiche celle qui correspond à la langue active.
- Les refus de commande renvoient un `code_refus` (enum `code_refus_commande`), jamais une phrase.
- Les notifications stockent un `type` + un champ `donnees` (JSONB) avec les paramètres (produit, quantité...) ; le texte affiché est généré côté app à partir d'un template traduit (`.arb`), pas stocké en base.
- Toute nouvelle fonctionnalité qui semble nécessiter un champ "message" ou "titre" en base doit d'abord être reconsidérée selon ce pattern avant d'être ajoutée.

Documents de référence à toujours consulter avant de modifier la structure de données ou l'architecture :
- `docs/schema.sql` — schéma PostgreSQL complet et définitif (tables, types, contraintes). Ne jamais créer de table ou de colonne qui s'en écarte sans le mettre à jour en même temps.
- `docs/cahier-des-charges-flutter.md` — spécification de l'application mobile unique Employé/Agent (routing par rôle, architecture, écrans).

Si une instruction de prompt contredit ces deux fichiers, **signaler la contradiction avant de coder**, ne pas trancher silencieusement.

## Périmètre actuel (MVP)

Couvert : Auth, Utilisateurs/Rôles, Catalogue, Commandes (cycle de vie complet), Stock (déduction simple + alerte seuil), Quotas, Notifications, App Flutter Employé+Agent.

Explicitement hors périmètre pour l'instant (ne pas développer sans demande explicite) : Web Admin, Reporting avancé, réapprovisionnement fournisseur automatisé, mode hors-ligne avec file d'écriture différée, audit exhaustif sur toutes les entités.

## Stack imposée

**Backend**
- NestJS (TypeScript)
- PostgreSQL via Prisma (ou TypeORM — figer le choix dès la première session et ne plus en dévier)
- Validation : `class-validator` / `class-transformer` sur tous les DTOs
- Auth : Passport JWT + refresh token
- Tests : Jest (unitaires) + Supertest (e2e)
- WebSocket : `@nestjs/websockets` (Gateway) pour les mises à jour de statut de commande en temps réel

**Mobile**
- Flutter (null-safety)
- State management : Riverpod
- Routing : `go_router` avec redirection conditionnelle par rôle
- HTTP : `dio` avec intercepteur JWT/refresh
- Stockage sécurisé : `flutter_secure_storage` (tokens), jamais `SharedPreferences` pour des données sensibles
- Modèles : `freezed` + `json_serializable`
- Tests : `flutter_test` + `integration_test`

## Conventions de code

### Backend (NestJS)
- Un module par domaine métier : `auth`, `utilisateurs`, `catalogue`, `commandes`, `stocks`, `quotas`, `notifications`, `audit`
- Logique métier dans des services dédiés, jamais dans les contrôleurs (ex. le moteur de règles de validation de commande vit dans `CommandeValidationService`, pas dans `CommandesController`)
- Toute transition de statut de commande passe par une machine à états explicite — ne jamais autoriser un changement de statut arbitraire
- Toute erreur métier (stock insuffisant, quota dépassé, hors horaires, rôle non autorisé) retourne un code d'erreur distinct, jamais un message générique
- Nommage des tables/colonnes en français et en snake_case, à l'identique de `docs/schema.sql` — ne jamais renommer une colonne dans le code sans renommer aussi dans le schéma
- **Les routes HTTP exposées (`@Controller`/`@Get`/`@Post`/`@Patch`/`@Delete`) sont nommées en anglais** (ex. `/users/me`, `/orders/:id/status`, `/orders/mine`, `/catalog`, `/quotas/me`) — uniquement la surface publique de l'API ; les modules, classes, services, DTOs et noms de champs JSON restent en français/snake_case comme `docs/schema.sql` l'exige (ex. le contrôleur `UtilisateursController` sert désormais `/users`, le corps de `POST /orders` continue d'utiliser `lignes`/`produit_id`/`quantite`). Toute nouvelle route doit suivre cette convention anglaise dès sa création.
- Chaque endpoint qui touche une commande ou un stock doit vérifier l'appartenance au site de l'utilisateur authentifié, pas seulement son rôle

### Mobile (Flutter)
- Respecter l'arborescence définie dans `docs/cahier-des-charges-flutter.md` section 3.2 : `core/`, `routing/`, `features/employe/`, `features/agent/`, `shared/`
- `features/employe/` et `features/agent/` ne s'importent jamais entre eux — uniquement via `core/` ou `shared/`
- Toute nouvelle route doit être ajoutée à la table de routes du document de référence (section 4.2) et protégée par le guard de rôle
- Pas de chaîne de texte en dur dans les widgets — passer par `intl`/fichiers `.arb`, **arabe comme locale par défaut**, dès le tout premier écran (pas seulement le français des prototypes précédents)
- Utiliser systématiquement les variantes directionnelles (`EdgeInsetsDirectional`, alignements `start`/`end`) plutôt que `left`/`right`, pour un rendu RTL correct sans réécriture ultérieure
- Choisir une police gérant les glyphes arabes dès le premier écran créé (ex. `Cairo`, `Tajawal`)
- Sélecteur de langue (arabe/anglais) accessible depuis le profil, persisté localement (pas besoin de re-login pour changer de langue)

## Sécurité — non négociable

- Le rôle n'est jamais vérifié uniquement côté app : chaque endpoint backend revérifie le rôle et l'appartenance au site/entreprise
- Aucun secret, token ou mot de passe en dur dans le code — toujours via variables d'environnement (`.env`, jamais committé)
- Les migrations de base de données et tout ce qui touche à `auth`/rôles doivent être signalées comme "à relire en priorité" dans le message de fin de tâche

## Commandes utiles

**Backend** (depuis `backend/`)
```bash
npm run start:dev       # serveur en mode watch
npm run test             # tests unitaires
npm run test:e2e         # tests end-to-end
npx prisma migrate dev   # appliquer une nouvelle migration (si Prisma)
```

**Mobile** (depuis `mobile/`)
```bash
flutter run
flutter test
flutter test integration_test
flutter build apk --debug
```

**Base de données locale**
```bash
docker start pg-hospitalite   # ou docker run ... si pas encore créé, voir docs/
```

## Workflow attendu de Codex sur ce projet

1. Avant toute modification structurante (nouvelle table, nouveau module, nouvelle route), relire le document de référence concerné dans `docs/`.
2. Découper le travail par couche (modèle → service → contrôleur/écran → tests) plutôt que de tout générer en un seul bloc.
3. Toujours livrer les tests en même temps que la fonctionnalité, pas après.
4. Un commit logique par fonctionnalité livrée, message de commit en français, descriptif (pas "fix" ou "update").
5. En fin de tâche, indiquer explicitement les fichiers qui touchent à la sécurité ou aux migrations, pour revue prioritaire.

## État du projet (à tenir à jour manuellement au fil des jours)

- [x] Jour 1 — Auth (login, JWT + refresh, guards rôles/permissions) + migrations DB (Prisma, choix figé)
- [x] Jour 1 — Module Utilisateurs (`/users/me`, CRUD, isolation multi-tenant) + tests e2e Supertest sur base dédiée `tarhib_test`
- [x] Jour 2 (partiel) — `GET /catalog` (filtrage actif/rôle via `produits_roles`/site via `produits_sites`)
- [x] Jour 2 (partiel) — Schéma `produits`/`categories_produits`/`commandes`/`notifications` migré pour le bilinguisme ar/en (`nom_ar`/`nom_en`, `code_refus_commande`, `notifications.donnees`)
- [x] Jour 2 (partiel) — `CHECK chk_produits_nom_en_non_vide` sur `produits` (refuse `nom_en` vide/blanc au niveau DB, donc même via un script de seed)
- [x] Jour 2 (partiel) — `POST /orders` : moteur de validation automatique (`CommandeValidationService`) + calcul de priorité par rôle
- [x] Jour 2 (partiel) — `PATCH /orders/:id/status` : machine à états (`CommandeStatutService`) + déduction de stock/incrémentation des quotas/audit/notification à la livraison
- [x] Jour 2 (partiel) — Module `stocks` (`StocksService`) : déduction par emplacement (cuisine avant stockage_site) + `mouvements_stock` systématique + alerte `rupture_stock` sous `seuil_minimal`
- [ ] Jour 2 — Approbation manuelle (`en_attente_approbation`), refus/annulation (`refusee`/`annulee`), Quotas (CRUD), Stocks (réapprovisionnement fournisseur)
- [x] Jour 3 (partiel) — Socle Flutter : arborescence §3.2, Riverpod + go_router (redirection par rôle §4), client dio (intercepteur JWT/refresh), intl (`app_ar.arb`/`app_en.arb`, arabe par défaut, `Directionality` explicite)
- [x] Jour 3 (partiel) — Backend : `GET /quotas/me` (nouveau module `quotas`, lecture seule), `GET /orders/mine` ; Flutter : dashboard Employé (quota restant, commandes en cours, raccourci nouvelle commande) + écran Catalogue réels, consommant ces endpoints + `GET /catalog`/`GET /users/me`
- [x] Jour 3 (partiel) — Backend : `GET /orders/:id` (scopé au demandeur) ; Flutter : formulaire de création de commande (produit/quantité/lieu/salle/heure/commentaire, `POST /orders`) + écran de détail/suivi (`GET /orders/:id`)
- [ ] Jour 3 — Historique des commandes (filtres date/statut) — actuellement un stub `PlaceholderScreen`
- [x] Jour 3 (partiel) — Backend : renommage de toutes les routes HTTP en anglais (`/utilisateurs`→`/users`, `/catalogue`→`/catalog`, `/commandes`→`/orders`, `mes-commandes`→`mine`, `:id/statut`→`:id/status`, `quotas/moi`/`utilisateurs/moi`→`/me`) ; Flutter mis à jour en conséquence ; ajout de `backend/prisma/seed.ts` (script de seed idempotent pour les tests manuels, `npm run seed`)
- [ ] Jour 4 — Parcours Agent (écrans réels) + temps réel (WebSocket) + notifications (FCM + écran réel)
- [ ] Jour 5 — Tests, durcissement, déploiement recette

### Notes opérationnelles (mobile)
- Stack figée : Riverpod (classique, `Notifier`/`AsyncNotifier`, sans codegen `riverpod_generator`) + `go_router` + `dio` + `flutter_secure_storage` + `shared_preferences` + `intl`/`flutter_localizations`. `flutter pub add` a résolu **Riverpod 3** (pas 2) — API différente sur un point qui casse silencieusement à la compilation si on suit une doc/tutoriel Riverpod 2 : `AsyncValue.valueOrNull` n'existe plus, c'est `AsyncValue.value` qui est devenu nullable directement.
- **Écart documenté entre `docs/cahier_des_charges_flutter.md` §4.1 et `docs/schema.sql`** : le cahier des charges Flutter suppose un rôle binaire renvoyé par l'API (`EMPLOYE` ou `AGENT`, "autres rôles rejetés... avec message explicite"), alors que `schema.sql` définit `roles.code` comme un champ libre (exemples donnés : EMPLOYE, AGENT, RESPONSABLE, ADMIN, VISITEUR). Décision prise en suivant le cahier des charges **à la lettre** plutôt qu'en élargissant silencieusement le mapping : `AppRole.depuisCodeRole` (`lib/core/auth/app_role.dart`) ne reconnaît que `EMPLOYE`/`AGENT` ; tout autre code renvoie `null`, traité comme un rôle non supporté (refus explicite, jamais d'accès, même si le serveur a authentifié l'utilisateur) — cf. `AuthState.estAuthentifie` (`role != null` requis) et `RoleNonSupporteParAppException`. À reconfirmer avec le métier si RESPONSABLE/VISITEUR doivent un jour utiliser l'app mobile.
- **`POST /auth/login` ne renvoie pas de champ `role`** (uniquement `{access_token, refresh_token}`, cf. `backend/src/auth/auth.service.ts` `emettreTokens`) : le rôle n'est connu côté app qu'après l'appel à `GET /users/me`, fait systématiquement par `AuthController` juste après l'enregistrement des tokens (login) et à chaque redémarrage tant qu'un refresh token est présent (`build()`). Avant ce changement, une première version décodait le rôle directement depuis le payload du JWT (`jwt_utils.dart`, supprimé) — abandonné au profit de l'appel `/users/me` pour disposer du profil complet (nom, prénom, site, permissions) en plus du rôle, et parce que le rôle décodé sans appel réseau n'était qu'une optimisation prématurée. `AuthState.profil` (type `UtilisateurProfil`, `lib/shared/models/utilisateur_profil.dart`, parsing JSON manuel — pas de `freezed`/`json_serializable`, non demandé à ce stade) porte ce profil ; `AuthState.role` en est dérivé (`AppRole.depuisCodeRole(profil.role.code)`). Pas de vérification d'expiration du token au démarrage : un access token expiré déclenche un 401 sur l'appel profil, que l'intercepteur dio tente de rafraîchir automatiquement avant d'échouer.
- **`AuthInterceptor`** (`lib/core/network/auth_interceptor.dart`) hérite de `QueuedInterceptor` (pas `Interceptor`) : sérialise les `onError` concurrents, indispensable puisque le refresh token backend est à usage unique (rotation, cf. `AuthService.refresh`) — sans cette sérialisation, deux requêtes échouant en 401 en parallèle tenteraient de rafraîchir avec le même token et l'une des deux échouerait à tort. Utilise un second `Dio` *sans* intercepteur (`dioPublicProvider`) pour l'appel `/auth/refresh` et le replay de la requête originale, afin d'éviter toute ré-entrance dans l'intercepteur.
- **Bridge go_router ↔ Riverpod** (`lib/routing/app_router.dart`) : `GoRouter.refreshListenable` attend un `Listenable` classique, pas un provider Riverpod. Pont minimal via un `ChangeNotifier` privé notifié par `ref.listen(authControllerProvider, ...)` au moment de la construction du provider `GoRouter` — pattern à réutiliser pour toute future logique de redirection dépendant d'un autre état Riverpod (ex. langue, permissions fines).
- **Écrans non encore développés** (historique, file d'attente, livraisons, détail commande Agent, notifications) : stubs `PlaceholderScreen` (`lib/shared/widgets/`) affichant uniquement une chaîne traduite générique (`placeholderEnConstruction`) — la table de routes §4.2 est intégralement câblée dans `app_router.dart`, mais le contenu métier de ces écrans reste à construire. Catalogue, dashboard Employé, création et détail de commande sont maintenant réels (voir ci-dessous).
- **Dashboard Employé + Catalogue** (`lib/features/employe/dashboard/`, `lib/features/employe/catalogue/`) : chaque section consomme un `FutureProvider` Riverpod dédié (`dashboard_providers.dart`, `catalogue_providers.dart`) qui appelle `dioProvider` directement — pas de couche "repository" séparée, jugée inutile pour un simple GET sans transformation complexe. `commandesEnCoursProvider` dérive de `mesCommandesProvider` (filtre côté app sur `CommandeResume.estEnCours`, statuts non terminaux) plutôt que d'ajouter un paramètre de requête côté backend — l'historique (statuts terminaux) réutilisera le même endpoint complet plus tard.
- **Formulaire de création de commande** (`lib/features/employe/commande/nouvelle_commande_screen.dart`) : un seul produit/quantité par commande (pas de panier multi-lignes) — conforme à la formulation au singulier du cahier des charges §2.2 ("produit, quantité, lieu, salle, heure souhaitée, commentaire"), même si le backend (`lignes: LigneCommandeDto[]`) supporte déjà plusieurs lignes. À étendre en panier si le besoin métier se confirme. `departement_id`/`service_id` ne sont pas collectés par ce formulaire (non demandés) — `heure_souhaitee` est donc envoyée sans qu'aucune vérification d'horaires de service ne s'applique côté backend (`verifierHorairesService` ne s'exécute que si `service_id` est fourni).
  - Les 5 refus métier de `POST /orders` (réponse 422, `{code_refus}` seul) sont traduits exclusivement à partir du code via `libelleCodeRefusCommande` (`shared/code_refus_commande_libelle.dart`) — jamais de texte du backend affiché tel quel, conforme à la règle bilinguisme.
  - À la création réussie, navigation par `context.pushReplacement` (pas `push`) vers l'écran de détail : remplace le formulaire dans la pile pour qu'un retour arrière ramène au dashboard, pas au formulaire déjà soumis.
- **Écran de détail/suivi de commande** (`lib/features/employe/commande/commande_detail_screen.dart`) : `commandeDetailProvider` est un `FutureProvider.family<CommandeResume, String>` (clé = `commandeId`) sur `GET /orders/:id`, scopé côté backend au demandeur (`commande.utilisateur_id !== utilisateur.sub` → 404, même logique que `/orders/mine`). Rafraîchissement par bouton explicite (`ref.invalidate`) — pas encore de WebSocket pour le suivi temps réel (hors périmètre de cette tâche, prévu Jour 4 cahier des charges §7.4/§16).
- **`GET /orders/:id`** (`backend/src/commandes/`) : ajouté après `GET /orders/mine` dans le contrôleur (ordre important — une route `:id` enregistrée avant `mine` l'intercepterait). Même scoping que `listerMesCommandes` (`utilisateur_id` du demandeur uniquement, 404 sinon) — pas encore ouvert à l'Agent (qui aura probablement besoin d'un scoping par site plutôt que par propriétaire, à traiter au Jour 4).
- **Chiffres (cahier des charges §12, point explicitement marqué « à confirmer »)** : faute de décision business, `formaterPrix`/`formaterNombre` (`lib/shared/bilingue.dart`) forcent la numérotation occidentale (0123) même en arabe — seul le symbole de devise varie (`د.ل` vs `LYD`) — car le cahier des charges indique que c'est l'usage majoritaire déclaré en Libye. **Décision technique prise faute de réponse du métier, à confirmer explicitement.**
- **Endpoints self-service ouverts à tout utilisateur authentifié** (`GET /quotas/me`, `GET /orders/mine`, comme `GET /users/me`) : `JwtAuthGuard` seul, pas de `@RequirePermissions` — la donnée est intrinsèquement scopée à l'utilisateur courant (`utilisateur_id`/`utilisateur.sub`), une permission supplémentaire n'apporterait rien.
- **Sélecteur de langue** : noms des langues ("العربية"/"English") volontairement **non** passés par `intl` dans `ProfilScreen` — ce sont des endonymes (noms de langue dans leur propre langue), pas du texte d'interface qui varie selon la langue active ; convention standard pour ce type de menu.
- Test widget (`test/widget_test.dart`) : `flutter_secure_storage` utilise un canal de plateforme natif indisponible en environnement de test → `secureStorageProvider` est surchargé par un fake en mémoire (`_SecureStorageDeTest`) via `ProviderScope(overrides: [...])`, plutôt que de mocker le `MethodChannel` directement.
- Build natif (Windows desktop) non vérifié dans cet environnement : `flutter build windows` échoue ici faute du mode développeur Windows (symlinks), sandbox sans accès aux paramètres système. Vérifié à la place via `flutter analyze` (aucune erreur) et `flutter test` (passe).

### Notes opérationnelles (backend)
- **Routes HTTP renommées en anglais** (cf. nouvelle convention dans « Conventions de code » ci-dessus) : `/utilisateurs`→`/users` (`/utilisateurs/moi`→`/users/me`), `/catalogue`→`/catalog`, `/commandes`→`/orders` (`mes-commandes`→`/orders/mine`, `:id/statut`→`:id/status`), `/quotas/moi`→`/quotas/me`. Seuls les chemins d'URL (`@Controller`/`@Get`/etc.) ont changé — noms de modules/services/classes (`UtilisateursController`, `CommandesService`...), champs JSON (`identifiant`, `mot_de_passe`, `produit_id`, `code_refus`...) et tables/colonnes restent en français/snake_case, conformément à `docs/schema.sql`. Toutes les notes ci-dessous ont été mises à jour pour refléter les nouveaux chemins ; si une future note réintroduit un chemin français par erreur, c'est un copier-coller obsolète, pas une convention à suivre.
- **Données de test manuel** : `npm run seed` (`backend/prisma/seed.ts`, idempotent — relançable sans dupliquer) crée une entreprise/site/département "Tarhib Demo"/"Siège"/"Direction", les rôles `EMPLOYE`/`AGENT` avec les permissions utilisées par l'API, deux utilisateurs (`employe@tarhib.ly` / `agent@tarhib.ly`, mot de passe `password123` pour les deux), un produit ("قهوة عربية"/"Arabic Coffee") disponible sur le site avec 100 unités en stock, et un quota journalier (10/jour) pour le rôle Employé. Nécessaire car il n'existe ni endpoint d'inscription publique ni Web Admin (hors périmètre MVP) — le seul moyen de créer un premier utilisateur autrement serait `POST /users`, qui exige déjà d'être authentifié avec `UTILISATEUR_CREER` (problème de l'œuf et de la poule). **Exceptionnellement, le rôle Agent reçoit aussi `UTILISATEUR_*`** dans ce seed (pas réaliste en production, faute de rôle admin dans le schéma MVP) — uniquement pour pouvoir tester le CRUD utilisateurs sans Web Admin.
- ORM figé : **Prisma**. Prisma 7 exige un driver adapter (`@prisma/adapter-pg`) — `PrismaService` instancie `new PrismaPg({connectionString})`, jamais `new PrismaClient()` seul.
- `npx prisma migrate dev` refuse de tourner en environnement non interactif dès qu'il y a un warning (ex. contrainte unique). Pattern utilisé dans ce projet : `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` pour obtenir le SQL, l'écrire à la main dans `prisma/migrations/<timestamp>_<nom>/migration.sql`, puis `prisma migrate deploy` (à appliquer sur `tarhib` **et** `tarhib_test`).
- Base de test e2e dédiée : `tarhib_test` (même conteneur Postgres), config dans `backend/.env.test`, garde-fou anti-suppression dans `test/utils/prisma-test-client.ts`.
- `npm`/`npx` échouent avec `UNABLE_TO_VERIFY_LEAF_SIGNATURE` dans cet environnement → préfixer `NODE_OPTIONS=--use-system-ca`.
- **Tests unitaires des services de règles métier** (ex. `commande-validation.service.spec.ts`) : pas de `Test.createTestingModule`, juste `new CommandeValidationService(prismaMock)` avec un mock Prisma minimal (`{produit: {findMany: jest.fn()}, ...} as unknown as PrismaService`) — ces services n'ont qu'une seule dépendance et la valeur du Testing Module de Nest (DI réelle) n'apporte rien ici. Jest 30 / `jest-circus` n'a plus de global `fail()` (retiré, contrairement à Jasmine) : pour capturer une exception attendue dans un test async, passer par un helper (`capturerErreur`) qui retourne l'erreur catchée plutôt que par un bloc try/catch avec `fail()` en fin de `try`. Pour les 5 refus de `CommandeValidationService`, chaque test ne mocke que ce qui fait échouer **son** check, tout le reste reste sur les valeurs par défaut « tout passe » du `beforeEach` (sinon les vérifications précédentes dans l'ordre strict échoueraient avant d'atteindre le cas testé) — et vérifie `erreur.getResponse()` égal **exactement** `{code_refus: '...'}` (pas seulement le type d'exception), pour garantir qu'aucun champ `message` ne s'y glisse.
- **Champs bilingues obligatoires (`nom_ar`/`nom_en`) : `NOT NULL` ne suffit pas, une chaîne vide/blanche passe quand même.** `produits.nom_en` a un `CHECK (btrim(nom_en) <> '')` (`chk_produits_nom_en_non_vide`) pour le bloquer au niveau DB — seul moyen de garantir le refus même via un script de seed qui appelle Prisma directement (bypass total des DTOs/`class-validator`). Si un futur module crée/édite des `produits` (ou si on durcit `categories_produits`/`nom_ar`), ajouter le même type de CHECK plutôt que de compter sur la validation applicative seule.
- **`POST /orders`** (`backend/src/commandes/`) : la logique de règles vit entièrement dans `CommandeValidationService`, séparé de `CommandesService` (orchestration : résolution rôle/site, snapshot des prix, transaction de création) et du contrôleur. Les 5 vérifications s'exécutent **dans cet ordre strict** (la première qui échoue interrompt les suivantes) : disponibilité produit (`produits.actif` + `produits_sites.disponible` sur le site du demandeur) → stock suffisant (somme de `stocks.quantite` sur les emplacements du site, **pas de réservation** — déduction simple comme prévu au MVP, donc ne tient pas compte des autres commandes en attente) → quota non dépassé (`quotas` applicables au rôle, globaux `produit_id IS NULL` ou par produit ; comparé à `quotas_consommation` de la période courante, 0 si aucune ligne) → horaires du service ouvert (si `service_id` fourni et que le service a des horaires définis ; comparé à `heure_souhaitee` si fournie, sinon à l'heure courante) → rôle autorisé (`produits_roles` — même sémantique asymétrique que le catalogue : aucune ligne = ouvert à tous, une ligne = liste blanche de rôles).
  - Chaque échec lève une exception dédiée dont le corps est **exactement** `{"code_refus": "<valeur de l'enum>"}`, sans champ `message` — ne pas ajouter de texte, l'app Flutter traduit à partir du seul code (cf. règle bilinguisme ci-dessus). Erreurs hors de cet enum (site/département/service invalides, utilisateur sans site) restent au format `{code, message}` habituel : elles ne sont pas des refus métier de commande.
  - Priorité = copie directe de `roles.niveau_priorite` du demandeur (1 = le plus prioritaire) — aucune autre règle de calcul actuellement.
  - **Aucune déduction de stock ni incrémentation de quota à la création** : conforme au cycle décrit en tête de ce fichier (mise à jour des stocks/quotas intervient à la livraison, pas à la commande) — `POST /orders` ne fait que vérifier que la commande respecterait ces contraintes à l'instant T.
  - Protégé par permission `COMMANDE_CREER` (`PermissionsGuard`), à seeder comme les autres permissions du projet.
- **`PATCH /orders/:id/status`** (`backend/src/commandes/`) : machine à états explicite dans `CommandeStatutService` (cf. AGENTS.md « ne jamais autoriser un changement de statut arbitraire »), `CommandesService` se limite à charger la commande (404 `COMMANDE_INTROUVABLE` si absente **ou** si `commande.site_id !== utilisateur.site_id` — isolation multi-site, jamais un 403 qui confirmerait l'existence) et à déléguer. Une seule permission `COMMANDE_GERER_STATUT` protège l'endpoint pour l'instant (pas de permission distincte par étape du cycle) — à revoir si Jour 4 (parcours Agent) introduit une séparation des rôles plus fine.
  - Table de transitions autorisées, codée en dur, ne couvre que la chaîne demandée : `en_attente → validee → en_preparation → en_livraison → livree`. Les statuts `en_attente_approbation`/`refusee`/`annulee` de l'enum `statut_commande` ne sont pas branchés sur cet endpoint (hors périmètre demandé) — toute autre transition renvoie `400 {code: 'COMMANDE_TRANSITION_INVALIDE'}` (distinct de l'enum `code_refus_commande`, qui concerne uniquement les 5 refus à la création).
  - Effets de bord **uniquement à la transition vers `livree`**, dans une seule transaction Prisma interactive (`$transaction(async (tx) => ...)` — nécessaire car la déduction de stock doit vérifier la disponibilité *au moment de la livraison*, pas la rejouer depuis la création) :
    - Stock : délégué à `StocksService.deduireStockPourLivraison` (voir ci-dessous), appelé une fois par ligne de commande.
    - Quota : upsert `quotas_consommation` sur la période courante (réutilise `calculerDebutPeriode`/`calculerFinPeriode`, déplacées de `commandes/periode.util.ts` vers `src/quotas/periode.util.ts` pour être partagées avec le nouveau module `quotas`) — incrémente, ne revalide pas le plafond (la validation du plafond a eu lieu à la création).
    - Audit : une ligne `audit_logs` (`action: 'LIVRAISON_COMMANDE'`, `valeurs_avant`/`valeurs_apres` = `{statut}`).
    - Notification : une ligne `notifications` (`type: 'livraison'`, `donnees: {lignes: [{produit_id, quantite}]}`) — **aucun texte généré côté backend**, conforme à la règle bilinguisme : l'app construit le message localisé à partir du `type` + `donnees`.
  - Transitions `validee`/`en_preparation` posent aussi `valide_par_id`/`agent_id` = l'utilisateur qui effectue l'action (pas de vérification qu'un agent différent ne « reprenne » pas une commande déjà assignée — à durcir si le parcours Agent du Jour 4 l'exige).
- **`GET /orders/mine`** (`backend/src/commandes/`) : renvoie **toutes** les commandes de l'utilisateur courant (`utilisateur_id = utilisateur.sub`), tous statuts confondus, triées par `created_at` desc — pas de paramètre de filtre côté backend. Le tri « en cours » vs « historique » est fait côté app Flutter (`CommandeResume.estEnCours`). Pas de vérification de site (la portée par `utilisateur_id` suffit, c'est intrinsèquement les données de l'utilisateur).
- **Module `quotas`** (`backend/src/quotas/`, nouveau) : `GET /quotas/me` est **lecture seule** — pas de CRUD `quotas` (toujours hors périmètre, cf. liste des tâches Jour 2 non cochées). `QuotasService.getQuotasUtilisateur` reprend exactement la même résolution des quotas applicables que `CommandeValidationService.verifierQuotas` (globaux `role_id IS NULL` ou spécifiques au rôle), mais calcule en plus `valeur_restante = max(valeur_max - valeur_consommee, 0)` pour l'affichage. `periode.util.ts` (désormais dans ce module) calcule aussi `periode_fin`, jusqu'ici un détail interne à `CommandeStatutService`.
- **`GET /quotas/me` et `GET /orders/mine`** : protégés par `JwtAuthGuard` seul (pas de `@RequirePermissions`), même logique que `GET /users/me` — la donnée est déjà scopée à l'utilisateur courant, une permission n'ajouterait rien.
- **Module `stocks`** (`backend/src/stocks/`) : `StocksService.deduireStockPourLivraison` reçoit le client de transaction (`Prisma.TransactionClient`) plutôt que `PrismaService` — appelé *à l'intérieur* de la transaction de `CommandeStatutService`, jamais de manière autonome avec sa propre transaction (sinon la déduction de stock et l'écriture du statut de commande pourraient diverger en cas d'échec partiel).
  - Déduction séquentielle sur les lignes `stocks` du produit à tous les `emplacements_stock` du site, triées par `emplacement.type` (**cuisine avant stockage_site** — on consomme le point de service avant la réserve). Si la somme disponible est insuffisante au moment de la livraison (le stock a pu changer depuis la création de la commande, ce n'est **pas** un des 5 `code_refus`) : lève `StockInsuffisantPourLivraisonException` (`backend/src/stocks/stocks.exceptions.ts`, `409 {code: 'COMMANDE_STOCK_INSUFFISANT_LIVRAISON'}`), ce qui annule toute la transaction (rien n'est muté, vérifié manuellement).
  - Une ligne `mouvements_stock` (`type: 'sortie'`) est créée **systématiquement** pour chaque emplacement effectivement débité (donc potentiellement plusieurs lignes pour une seule ligne de commande si elle chevauche plusieurs emplacements).
  - Après chaque mise à jour de `stocks.quantite`, si la nouvelle quantité de cet emplacement tombe sous son propre `seuil_minimal`, une notification `type: 'rupture_stock'` est créée avec `donnees: {produit_id}` (pas de texte, conforme à la règle bilinguisme) — envoyée à l'utilisateur qui a effectué la livraison (l'agent). **Choix par défaut faute de notion de "responsable stock" dans le schéma** : pas de diffusion à tous les agents du site ni de déduplication si le stock reste sous le seuil sur plusieurs livraisons successives — à revoir si le Jour 4 (parcours Agent) introduit une affectation explicite par site.

*Mettre à jour cette section et ajouter toute décision ou convention découverte en cours de route pour que les sessions suivantes repartent avec le bon contexte.*