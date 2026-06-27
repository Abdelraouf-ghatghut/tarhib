# CLAUDE.md

Ce fichier donne à Claude Code (et à tout agent IA travaillant sur ce repo) le contexte nécessaire pour développer, modifier ou déboguer **Tarhib**. À lire avant toute tâche.

---

## 1. Contexte du projet

**Tarhib** est une plateforme de gestion de l'hospitalité corporate (commandes de boissons/snacks/repas, gestion des salles de réunion, stocks, achats, priorités/SLA) pour un prestataire qui sert plusieurs sociétés clientes, chacune avec plusieurs branches/départements/employés.

- **Architecture** : Multi-tenant (Société Cliente = tenant), Multi-branche, Multi-département
- **Plateformes** : App mobile (iOS/Android) pour Employés & Agents d'Hospitalité + Portail Web Admin pour les rôles de gestion
- **Langues** : Arabe (par défaut, RTL) et Anglais — **tout texte affiché doit passer par i18n, jamais de chaîne en dur**
- Documents de référence dans ce repo : `Fiche_Fonctionnelle_Plateforme_Hospitalite.md` (liste exhaustive des modules), `Parcours_Employe_Agent_Hospitalite.md` (UX détaillée des deux rôles principaux), `Guide_Git_CICD.md` (workflow Git, structure du repo, CI/CD, tests)

## 2. Stack technique (à respecter, ne pas dévier sans discussion)

| Couche            | Techno                                                          | Notes                                                                                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile            | Flutter (Dart)                                                  | Support RTL natif (widgets `Directionality`/`MaterialApp` localisés), mode offline (Drift/SQLite ou Hive) pour les Agents d'Hospitalité sur le terrain. Une seule base de code pour iOS/Android.                              |
| Web Admin         | React + TypeScript, Ant Design ou MUI                           | RTL natif                                                                                                                                                                                                                     |
| Backend           | NestJS (Node.js/TypeScript)                                     | Modulaire, un module Nest = un module métier (voir §4)                                                                                                                                                                        |
| DB principale     | PostgreSQL                                                      | Schéma multi-tenant via `tenant_id` (company_id) sur les tables concernées                                                                                                                                                    |
| Cache / Files     | Redis                                                           | File de la cuisine, sessions, rate limiting                                                                                                                                                                                   |
| Temps réel        | Socket.io                                                       | Statuts de commande, alertes SLA, dashboard cuisine                                                                                                                                                                           |
| Auth              | Keycloak                                                        | RBAC, OTP via Twilio, SSO Azure AD/Google (futur)                                                                                                                                                                             |
| Notifications     | FCM (push), SendGrid/SES (email), Twilio (SMS)                  |                                                                                                                                                                                                                               |
| Stockage fichiers | S3 / MinIO                                                      | Images produits                                                                                                                                                                                                               |
| i18n              | i18next (Web Admin) / `flutter_localizations` + `intl` (Mobile) | + CSS logical properties pour le RTL côté web (jamais `left`/`right` en dur dans le CSS) ; côté Flutter, RTL géré nativement par le framework (`Directionality`), jamais de `EdgeInsets`/`Alignment` non-directionnels en dur |
| Infra             | Docker + Kubernetes                                             | CI/CD via GitHub Actions                                                                                                                                                                                                      |

## 3. Règles métier critiques — à NE JAMAIS casser

Ces règles ont été définies explicitement et sont au cœur du produit. Toute modification de code touchant aux commandes ou aux produits doit les respecter :

1. **Pas de budget.** Le système ne gère AUCUNE notion de budget (montant €/$ consommé/restant). Seule la notion de **quota** (quantité par produit/période) existe. Si une fonctionnalité semble nécessiter un "budget", vérifier auprès du métier avant d'implémenter — ce n'est probablement pas voulu.

2. **Produits VIP en libre-service ≠ produits commandables.**
   - Un produit a un type : `commandable` ou `libre_service_vip`.
   - Les produits `libre_service_vip` ne doivent **jamais** apparaître dans le catalogue de commande de l'Employé, quel que soit son rôle. Ils sont stockés physiquement à l'avance (frigo/bureau VIP) et consommés hors application.
   - Ces produits ne génèrent **jamais** de commande, de quota, de priorité ni de SLA.
   - Ils sont suivis uniquement via le module Stock, sur un **emplacement dédié** (ex. "Frigo — Bureau CFO"), avec ses propres seuils min/max. Le passage sous le seuil déclenche une **tâche de réapprovisionnement** (pas une commande) assignée à l'Agent d'Hospitalité ou à l'Inventory Manager.

3. **Moteur de validation de commande — ordre des contrôles à respecter.** Pour chaque ligne d'un panier, dans cet ordre exact :
   1. Le produit est `commandable` et le rôle de l'employé l'autorise (vérifié côté serveur, jamais seulement côté UI)
   2. Stock disponible dans la branche ≥ quantité demandée (revérifié à la confirmation, pas seulement à l'ajout au panier — le stock peut avoir changé)
   3. Quota produit restant sur la période (jour/semaine/mois) ≥ quantité demandée
   - Décision agrégée sur l'ensemble du panier : validation auto / attente d'approbation (Department Manager) / rejet automatique de la ligne fautive — jamais de blocage de tout le panier pour une seule ligne en faute, sauf si la config société l'exige explicitement.

4. **Visibilité produit = filtrage backend, pas seulement UI.** Toute restriction de rôle ou de type de produit doit être appliquée côté API (les endpoints catalogue doivent filtrer selon le rôle de l'appelant). Ne jamais se fier à un simple `hidden` côté front pour la sécurité.

5. **Priorité et SLA.** Chaque commande hérite d'une priorité (P1 à P5) dérivée du rôle de l'employé et du contexte (réunion, urgence). Le SLA associé doit être recalculé et affiché en temps réel côté Agent d'Hospitalité (compte à rebours), jamais une valeur statique calculée une seule fois à la création.

## 4. Découpage modulaire attendu (backend)

Faire correspondre les modules NestJS aux modules métier de la fiche fonctionnelle, pas l'inverse. Modules principaux (voir `Fiche_Fonctionnelle_Plateforme_Hospitalite.md` pour le détail complet) :

```
auth/            companies/        branches/        departments/
employees/       products/         suppliers/       procurement/
inventory/       inventory-transfers/   orders/      priority-sla/
quotas/          meeting-rooms/   kitchen/          delivery/
hospitality-service/   vip-self-service/   notifications/
reporting/        dashboards/      i18n/             audit/
```

`vip-self-service/` est un module à part entière (pas un sous-module d'`orders/`), car sa logique (emplacements, seuils, tâches de réappro) n'a rien à voir avec le cycle de commande.

## 5. Conventions de code

- TypeScript strict partout (`strict: true`), pas de `any` non justifié
- DTOs validés avec `class-validator` sur chaque endpoint
- Toute entité métier sensible (commande, stock, quota) doit avoir un test unitaire couvrant le moteur de validation avant merge
- Migrations DB versionnées (TypeORM/Prisma migrations), jamais de modification manuelle de schéma en prod
- Toute chaîne affichée à l'utilisateur passe par une clé i18n (`t('orders.status.delivered')`), jamais de texte en dur
- Nommage des entités en anglais dans le code, mais les libellés UI sont bilingues AR/EN via i18n

## 5-bis. Git — règles à appliquer systématiquement

Guide complet : `Guide_Git_CICD.md`. Résumé opérationnel pour toute tâche de code :

- **Jamais de commit direct sur `main`.** Toujours créer une branche `feature/TARHIB-<id>-description`, `fix/TARHIB-<id>-description`, etc.
- **Commits au format Conventional Commits** : `feat(scope): ...`, `fix(scope): ...`, `test(scope): ...`, `docs(scope): ...`. Référencer le ticket Jira si connu.
- **Une PR par ticket**, jamais plusieurs sujets mélangés dans une même branche.
- **Rebase sur `main` avant de pousser**, pas de merge commit dans l'historique de feature branch.
- **Avant d'ouvrir/mettre à jour une PR sur les modules `orders`, `quotas`, `vip-self-service`** : vérifier que les tests couvrant la matrice de décision du moteur de validation sont présents et passent (voir §3 ci-dessus).
- **Ne jamais utiliser `git push --force`** : utiliser `--force-with-lease` si un amend est nécessaire après revue.
- Si une tâche révèle une règle métier non documentée ici, la proposer en ajout au présent fichier dans la même PR.

## 6. Avant de commencer une tâche

1. Relire la règle métier concernée dans `Fiche_Fonctionnelle_Plateforme_Hospitalite.md` ou `Parcours_Employe_Agent_Hospitalite.md`
2. Vérifier si la tâche touche au moteur de validation, au flux VIP libre-service, ou à la gestion des quotas — si oui, relire le §3 ci-dessus avant de coder
3. Pour toute ambiguïté métier (ex. "faut-il un budget ici ?"), partir du principe que la réponse est non si ce n'est pas explicitement documenté

## 7. Ce qui n'existe PAS dans ce produit (pour éviter les suppositions)

- Pas de gestion de budget monétaire
- Pas de paiement en ligne dans l'app employé (l'hospitalité est un service interne, pas un e-commerce payant)
- Pas de commande pour les produits VIP libre-service
- Pas de panier partagé entre plusieurs employés (les commandes groupées restent rattachées à un seul créateur)

## Règles permanentes pour Claude Code

### Après toute modification d'un DTO backend

Toujours rappeler : `npm run generate:mobile-api` doit être lancé avant de committer
si la PR touche `src/products/dto/`, `src/orders/dto/`, `src/quotas/dto/`.

### Interdiction absolue

- Ne jamais introduire de notion de "budget" (variable, commentaire, champ DB, DTO)
- Ne jamais filtrer par rôle ou type de produit côté UI seulement

### Moteur de validation (src/orders/validation-engine/)

Toujours dans cet ordre : rôle/type produit → stock disponible → quota restant.
Toujours couvert par validation-engine.spec.ts.

### Bilingue obligatoire

Chaque entité avec un nom visible a nameAr ET nameEn. Jamais l'un sans l'autre.

---

## 8. État d'avancement et prochaines tâches (mis à jour le 2026-06-27)

### Ce qui est implémenté (branch `feature/TARHIB-1-auth-rbac`)

| Ticket    | Statut    | Ce qui existe                                                                              |
| --------- | --------- | ------------------------------------------------------------------------------------------ |
| TARHIB-1  | In Review | Epic AUTH — JWT guard, RolesGuard, @Roles, @CurrentUser, GET /auth/me                      |
| TARHIB-21 | In Review | POST /auth/login — Keycloak password grant + brute-force Redis                             |
| TARHIB-22 | In Review | POST /auth/otp/request + /verify — OTP Redis 5min + Twilio                                 |
| TARHIB-23 | In Review | POST /auth/password/reset-request + /reset — token Redis 1h + révocation sessions Keycloak |
| TARHIB-24 | In Review | POST /auth/refresh + /logout — délégation Keycloak                                         |
| TARHIB-25 | In Review | RolesGuard matrice complète — 11 cas unit + 8 tests intégration HTTP                       |

Infrastructure posée : `RedisModule` (global), `KeycloakService`, `SmsService`, `EmailService`.
Variables d'environnement : **configurées** (JWT*SECRET, KEYCLOAK*_, REDIS*URL, TWILIO*_, APP_URL, LOGIN_LOCK_DURATION_SECONDS).

### À faire avant de merger la PR AUTH

- [ ] Configurer le **realm Keycloak** `tarhib` : créer le client `tarhib-backend`, ajouter les mappers de claims (`companyId`, `branchId`, `role`) dans le token JWT
- [ ] Remplir les **migrations TypeORM vides** dans `src/migrations/` (tables companies, branches, departments, employees — les stubs sont créés mais sans SQL)
- [ ] Câbler **SendGrid/SES** dans `EmailService` (`src/auth/email/email.service.ts`) dès que la clé API est disponible

### Prochains tickets à implémenter (dans l'ordre recommandé)

1. **TARHIB-[ORG]** — Modules Companies / Branches / Departments / Employees (CRUD, entités TypeORM, migrations)
   - Dépendance : `AuthModule` exporté ✅ — les futurs modules importent `JwtAuthGuard` + `RolesGuard` depuis `AuthModule`
   - Rappel : injecter `companyId` depuis `JwtPayload` dans chaque requête TypeORM (`WHERE company_id = :companyId`)

2. **TARHIB-[PROD]** — Module Products (catalogue, type `commandable`/`libre_service_vip`, filtrage backend par rôle)
   - Règle §3 : le filtrage `type=COMMANDABLE` se fait dans le service, jamais seulement dans l'UI

3. **TARHIB-[STOCK]** — Module Inventory (stock par branche, seuils, alertes)

4. **TARHIB-[ORDER]** — Module Orders + `src/orders/validation-engine/` (moteur rôle→stock→quota)
   - Les stubs `validation-engine.service.ts` et `validation-engine.spec.ts` sont vides — à implémenter en priorité

5. **TARHIB-[QUOTA]** — Module Quotas (config par société/période/produit/rôle)

### Rappels techniques permanents issus de l'implémentation AUTH

- `KeycloakService.loginWithPhoneOtp()` utilise un grant `password` avec marqueur interne — à remplacer par un **custom Keycloak authenticator** ou un **direct grant OTP** en V2 si Keycloak le supporte nativement
- Le middleware **tenant isolation** (injection `WHERE company_id`) n'est pas encore posé — à ajouter dans chaque module métier lors de son implémentation, en lisant `request.user.companyId` (disponible via `JwtPayload`)
- `EmailService` est un **stub logger** — brancher SendGrid/SES avant la mise en prod (variable `SENDGRID_API_KEY`)
- `SmsService` passe en mode mock si `TWILIO_ACCOUNT_SID` est absent — comportement normal en dev/test
