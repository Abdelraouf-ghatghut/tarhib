<!--
Sync Impact Report
==================
Version change: (template) → 1.0.0 — adoption initiale
Modified principles: n/a (première rédaction)
Added sections:
  - Core Principles (6 principes : I–VI)
  - Contraintes techniques (stack imposée)
  - Workflow de développement (Git, revue, gates)
  - Governance
Removed sections: aucun (placeholders du template remplacés)
Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — le « Constitution Check » est un gate
    générique rempli depuis ce fichier ; aucun changement de structure requis
  - ✅ .specify/templates/spec-template.md — aucune section obligatoire ajoutée/retirée
  - ✅ .specify/templates/tasks-template.md — les catégories de tâches existantes
    couvrent tests/i18n ; aucun type nouveau imposé
  - ✅ pas de répertoire .specify/templates/commands/ dans ce repo
Follow-up TODOs: aucun
-->

# Constitution Tarhib

## Core Principles

### I. Quotas, jamais de budget

Le système ne gère AUCUNE notion de budget monétaire (montant consommé/restant) ni de
paiement dans l'app employé. La seule limitation de consommation est le **quota**
(quantité par produit/période : jour, semaine, mois). Toute fonctionnalité qui semble
nécessiter un « budget » DOIT être requalifiée en quota ou refusée après vérification
métier. Les prix n'existent que dans le module Achats (fournisseurs) et ne sont JAMAIS
exposés aux employés clients.

**Rationale** : l'hospitalité est un service interne rendu par un prestataire, pas un
e-commerce ; introduire de l'argent côté employé dénaturerait le produit.

### II. VIP libre-service ≠ produits commandables

Un produit a un type exclusif : `COMMANDABLE` ou `LIBRE_SERVICE_VIP`. Les produits VIP ne
DOIVENT jamais apparaître dans le catalogue de commande, ne génèrent jamais de commande,
de quota, de priorité ni de SLA. Ils sont suivis uniquement via le module Stock sur des
**emplacements dédiés** avec seuils min/max propres ; le passage sous seuil déclenche une
**tâche de réapprovisionnement** (jamais une commande). `vip-self-service/` reste un
module backend à part entière, distinct d'`orders/`.

**Rationale** : les deux flux ont des cycles de vie incompatibles ; les mélanger casse le
moteur de commande et le reporting.

### III. Moteur de validation serveur, ordre fixe (NON-NÉGOCIABLE)

Toute restriction de visibilité ou de commande est appliquée **côté API** — jamais
seulement masquée dans l'UI. Pour chaque ligne d'un panier, les contrôles s'exécutent
dans cet ordre exact :

1. Produit `COMMANDABLE` et rôle de l'employé autorisé (vérifié serveur) ;
2. Stock branche ≥ quantité demandée, **re-vérifié à la confirmation** ;
3. Quota produit restant sur la période ≥ quantité demandée.

La décision est agrégée sur le panier : validation auto / attente d'approbation manager /
rejet de la seule ligne fautive — jamais de blocage du panier entier pour une ligne, sauf
configuration société explicite. Chaque commande hérite d'une priorité dérivée du rôle et
du contexte ; le SLA associé est recalculé en continu côté Operations, jamais figé à la
création. L'employé client ne voit jamais la priorité ni le terme « SLA », seulement une
heure de livraison prévue.

### IV. i18n et RTL d'abord

L'arabe (RTL) est la langue par défaut, l'anglais la seconde. Toute chaîne affichée DOIT
passer par une clé i18n — aucune chaîne en dur dans les composants. Côté web : CSS logical
properties uniquement (jamais `left`/`right` en dur). Côté mobile : RTL géré par le
framework, jamais d'`EdgeInsets`/`Alignment` non directionnels en dur. Le nommage du code
est en anglais ; les libellés UI sont bilingues AR/EN. Le changement de langue est
instantané.

### V. Sécurité par le serveur, RBAC dynamique

L'authentification passe par Keycloak (JWT + refresh). Les permissions sont des clés
fines portées par des rôles dynamiques créés dans le web admin ; l'UI (menu, routes,
boutons) ne fait que refléter `permissions[]` — chaque endpoint est re-protégé par guards
(JWT + permissions + `dataScope`). Les tokens ne sont jamais persistés en clair : cookie
HttpOnly + access token en mémoire côté web, `expo-secure-store` côté mobile, jamais de
token en localStorage. Le portail admin est réservé au scope `TARHIB`.

### VI. Qualité : TypeScript strict, tests du moteur, migrations versionnées

TypeScript `strict: true` partout, pas de `any` non justifié. Chaque endpoint valide ses
DTOs avec `class-validator`. Toute entité sensible (commande, stock, quota) DOIT avoir un
test unitaire couvrant le moteur de validation avant merge. Les schémas DB évoluent
uniquement par migrations versionnées — jamais de modification manuelle en prod.

## Contraintes techniques

La stack est imposée ; toute déviation exige une discussion préalable documentée :

- **Backend** : NestJS modulaire — un module Nest = un module métier (auth, companies,
  branches, employees, products, orders, quotas, inventory, vip-self-service, etc.).
- **DB** : PostgreSQL multi-tenant via `tenant_id`/`company_id` ; **Redis** pour files,
  sessions, rate limiting ; **Socket.io** pour le temps réel (statuts, SLA, cuisine).
- **Web Admin** : React + TypeScript + Ant Design, thème SnowUI, RTL natif.
- **Mobile** : deux apps React Native (Expo) — `apps/mobile-employee` (vert `#55CFA8`) et
  `apps/mobile-operations` (bleu `#5B8CFF`) — partageant `packages/mobile-shared`.
  L'ancienne app Flutter (`apps/mobile`) est en fin de vie : hotfixes uniquement, aucune
  fonctionnalité nouvelle.
- **Auth** : Keycloak (RBAC, OTP Twilio) ; **Notifications** : FCM, SendGrid/SES, Twilio ;
  **Fichiers** : S3/MinIO ; **Infra** : Docker + Kubernetes, CI/CD GitHub Actions.
- **Police** : Thmanyah — ne pas redistribuer, modifier, permettre l'extraction ni vendre.

## Workflow de développement

- Jamais de commit direct sur `main` : branches `feature/TARHIB-<id>-description`,
  `fix/TARHIB-<id>-description`, etc.
- Commits au format Conventional Commits (`feat(scope): …`), ticket Jira référencé.
- **Une PR par ticket** ; rebase sur `main` avant push ; pas de merge commit dans les
  feature branches ; jamais de `git push --force` (`--force-with-lease` si nécessaire).
- Avant toute PR touchant `orders`, `quotas` ou `vip-self-service` : les tests de la
  matrice de décision du moteur de validation DOIVENT être présents et passer.
- Avant de coder : relire la règle métier concernée dans
  `Fiche_Fonctionnelle_Plateforme_Hospitalite.md` ou
  `Parcours_Employe_Agent_Hospitalite.md` ; en cas d'ambiguïté métier, la réponse par
  défaut est « non » si ce n'est pas documenté.
- Toute règle métier découverte et non documentée DOIT être proposée en ajout au
  `CLAUDE.md` (et à cette constitution si structurante) dans la même PR.

## Governance

Cette constitution prévaut sur toute autre pratique du repo. Les documents d'exécution
(`CLAUDE.md`, guides racine) détaillent l'application au quotidien et DOIVENT rester
cohérents avec elle.

- **Amendements** : par PR modifiant ce fichier, avec justification, mise à jour du
  Sync Impact Report et propagation aux templates `.specify/templates/*` et au
  `CLAUDE.md` concerné.
- **Versionnement sémantique** : MAJOR = retrait/redéfinition incompatible d'un principe ;
  MINOR = nouveau principe ou section matériellement étendue ; PATCH = clarification.
- **Conformité** : toute revue de PR vérifie le respect des principes I–VI (en priorité
  III et V) ; toute complexité ajoutée doit être justifiée dans la PR ; le gate
  « Constitution Check » du `plan-template.md` se remplit depuis ce fichier.

**Version**: 1.0.0 | **Ratified**: 2026-07-11 | **Last Amended**: 2026-07-11
