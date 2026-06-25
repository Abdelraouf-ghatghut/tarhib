# Guide Git, CI/CD & Bonnes Pratiques — Tarhib

**Objectif :** standardiser l'initialisation du repo, la structure du code, le workflow Git, l'intégration continue et les bonnes pratiques de développement pour l'équipe Tarhib.

---

## 1. Initialisation du repository

### 1.1 Création
```bash
mkdir tarhib && cd tarhib
git init -b main
```

On démarre directement avec `main` comme branche par défaut (pas de `master`), et on protège cette branche dès la création du repo distant (GitHub/GitLab) :
- Pull Request obligatoire avant merge sur `main`
- Au moins 1 (idéalement 2) approbation(s) requise(s)
- Status checks CI obligatoires (lint, tests, build) avant merge possible
- Pas de force-push sur `main`
- Squash merge uniquement (historique propre, voir §3.4)

### 1.2 Fichiers de base à committer en premier

```text
tarhib/
├── .gitignore
├── .editorconfig
├── .nvmrc                  # version Node.js fixée pour toute l'équipe (backend, web-admin)
├── README.md
├── CLAUDE.md               # déjà existant — contexte pour Claude Code
├── CONTRIBUTING.md         # renvoie vers ce guide
├── package.json            # racine du monorepo
├── turbo.json              # ou nx.json selon l'outil choisi
├── .husky/                 # git hooks (voir §5.3)
├── .github/
│   └── workflows/          # pipelines CI/CD (voir §4)
├── apps/
│   ├── mobile/              # Flutter (Dart) — Employé + Agent d'Hospitalité, iOS/Android — version SDK fixée via FVM (.fvmrc)
│   ├── web-admin/           # React + TS (rôles de gestion)
│   └── backend/             # NestJS
├── packages/
│   ├── shared-types/        # DTOs, enums, types partagés (Order, Product, Quota...)
│   ├── ui-kit/               # composants partagés web/mobile si pertinent
│   └── i18n/                 # fichiers de traduction AR/EN centralisés
└── docs/
    ├── Fiche_Fonctionnelle_Plateforme_Hospitalite.md
    ├── Parcours_Employe_Agent_Hospitalite.md
    ├── Guide_Implementation.md
    ├── Guide_MVP.md
    └── Guide_Jira_MCP.md
```

### 1.3 `.gitignore` minimal à committer dès le premier commit
```gitignore
node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
.turbo/
coverage/

# Flutter / Dart (apps/mobile)
**/.dart_tool/
**/.flutter-plugins
**/.flutter-plugins-dependencies
**/.packages
**/.pub-cache/
**/.pub/
**/ios/Pods/
**/ios/.symlinks/
**/android/.gradle/
*.iml
```

### 1.4 Premier commit
```bash
git add .
git commit -m "chore: initial monorepo setup"
git remote add origin git@github.com:<org>/tarhib.git
git push -u origin main
```

---

## 2. Structure du repo — pourquoi un monorepo

Un monorepo (Turborepo ou Nx) est recommandé pour Tarhib car :
- Le `shared-types` (DTOs `Order`, `Product`, `Quota`...) doit être identique entre backend et web admin, qui sont tous les deux en TypeScript — un monorepo évite la duplication ou la dérive entre repos séparés.
- Le moteur de validation de commande (règle métier critique, voir `CLAUDE.md` §3) ne doit exister qu'à un seul endroit, partagé entre backend et web admin.
- CI/CD unique, plus simple à maintenir qu'une orchestration multi-repos pour une équipe de cette taille — même si l'app mobile Flutter (Dart) a un toolchain distinct (`pub`, FVM) à l'intérieur de ce même repo (voir §2.1 ci-dessous).

> Si l'équipe grossit fortement en V2 (équipes mobile/backend totalement séparées), réévaluer un découpage multi-repos avec publication de `shared-types` en package npm interne.

### 2.1 Cas particulier : contrat backend ↔ mobile Flutter (Dart)

Le mobile étant en Dart et non en TypeScript, `packages/shared-types` (TS) **n'est pas directement consommable** par `apps/mobile`. Pour éviter que les DTOs Dart divergent silencieusement des DTOs TS au fil du temps :

- Le backend NestJS expose un schéma OpenAPI généré automatiquement (`@nestjs/swagger`), qui devient la **source de vérité unique** des contrats d'API (au même titre que `shared-types` l'est pour TS).
- Les modèles Dart côté `apps/mobile` sont **générés** à partir de ce schéma OpenAPI (ex. `openapi-generator-cli` cible `dart` ou `dio`, exécuté en étape de build/CI), plutôt qu'écrits/maintenus à la main.
- Toute modification d'un DTO côté backend (`orders`, `products`, `quotas`...) doit régénérer le client Dart dans la même PR — ajouter cette vérification à la checklist de revue de code (§5.4).
- Ne jamais dupliquer manuellement une règle de validation (ex. moteur de validation de commande) côté Dart : le mobile appelle l'API et affiche le résultat, il ne réimplémente jamais la logique métier (cohérent avec `CLAUDE.md` §3.4 — filtrage/validation toujours côté serveur).

---

## 3. Workflow Git

### 3.1 Stratégie de branches — Trunk-Based simplifié

```text
main (protégée, toujours déployable)
 │
 ├── feature/TARHIB-123-catalogue-filtrage-role
 ├── feature/TARHIB-145-moteur-validation-commande
 ├── fix/TARHIB-160-bug-quota-reset
 └── release/1.2.0   (tag, pas une branche longue-vie)
```

- Pas de branche `develop` permanente : on reste simple, `main` est la branche d'intégration continue.
- Une branche par ticket Jira, courte durée de vie (idéalement < 3 jours).
- Les releases se font par **tag** sur `main` (`v1.0.0`, `v1.1.0`...), pas par branche dédiée — voir §4.3 (déploiement).

### 3.2 Convention de nommage des branches

```text
<type>/<TICKET-ID>-<description-courte-en-anglais-ou-français>

feature/TARHIB-123-catalogue-uber-eats-style
fix/TARHIB-160-quota-reset-bug
chore/TARHIB-180-update-eslint-config
docs/TARHIB-190-readme-setup
```

Types autorisés : `feature`, `fix`, `chore`, `docs`, `refactor`, `test`, `hotfix`.

### 3.3 Convention de commits — Conventional Commits

```text
<type>(<scope>): <description courte>

[corps optionnel]

[TARHIB-123]
```

Exemples concrets pour Tarhib :
```text
feat(orders): ajoute le moteur de validation rôle/stock/quota
fix(catalog): corrige le filtrage des produits libre-service VIP
test(orders): couvre la matrice de décision du moteur de validation
docs(claude): met à jour la règle sur le scope MVP
chore(ci): ajoute le job de lint sur les PR
```

Types : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`. Validé automatiquement par un hook (voir §5.3 — commitlint).

### 3.4 Pull Requests

**Template `.github/PULL_REQUEST_TEMPLATE.md` :**
```markdown
## Ticket
TARHIB-XXX

## Quoi / Pourquoi
(description courte)

## Règles métier impactées
- [ ] Moteur de validation (rôle/stock/quota)
- [ ] Libre-service VIP
- [ ] Quotas
- [ ] Aucune

## Checklist
- [ ] Tests unitaires ajoutés/mis à jour
- [ ] i18n AR/EN vérifié si écran modifié
- [ ] RTL vérifié si écran modifié
- [ ] CLAUDE.md mis à jour si une règle métier a changé
```

**Règles de merge :**
- **Squash merge** uniquement sur `main` → historique linéaire, un commit = une feature/fix complète
- Le message de squash reprend le titre de la PR (donc soigner le titre de PR, pas juste le dernier commit)
- Supprimer la branche après merge (option à activer côté GitHub/GitLab)

### 3.5 Commandes Git courantes (cheat sheet équipe)

```bash
# Démarrer une feature
git checkout main && git pull
git checkout -b feature/TARHIB-123-catalogue-filtrage-role

# Pendant le développement
git add -p                      # stage sélectif, éviter "git add ."  aveugle
git commit -m "feat(catalog): ..."

# Se mettre à jour avec main avant de pousser
git fetch origin
git rebase origin/main           # préférer rebase à merge pour garder un historique propre

# Pousser
git push -u origin feature/TARHIB-123-catalogue-filtrage-role

# Après revue, corriger un commit sans polluer l'historique
git commit --amend --no-edit
git push --force-with-lease       # jamais --force tout court

# Nettoyer les branches locales déjà mergées
git branch --merged main | grep -v "main" | xargs git branch -d
```

---

## 4. CI/CD

### 4.1 Pipeline — étapes standard sur chaque PR

```text
PR ouverte/mise à jour
   │
   ▼
1. Install (cache des dépendances)
2. Lint (ESLint + Prettier check)
3. Type-check (tsc --noEmit)
4. Tests unitaires (par package affecté uniquement, via Turborepo/Nx affected)
5. Tests d'intégration (backend, contre une DB de test éphémère)
6. Build (vérifie que tout compile)
   │
   ▼
✅ Tous verts → merge autorisé (status checks obligatoires sur main)
```

### 4.2 Exemple GitHub Actions — `.github/workflows/ci.yml`

Deux jobs distincts : un pour le périmètre Node/TS (backend + web admin), un pour le mobile Flutter (toolchain totalement différent).

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  build-test-node:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: tarhib_test
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "npm"

      - run: npm ci

      - name: Lint
        run: npx turbo run lint

      - name: Type-check
        run: npx turbo run type-check

      - name: Tests unitaires (packages affectés)
        run: npx turbo run test --filter=...[origin/main]

      - name: Tests d'intégration backend
        run: npx turbo run test:integration --filter=backend
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/tarhib_test

      - name: Build
        run: npx turbo run build

  build-test-mobile:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/mobile
    steps:
      - uses: actions/checkout@v4

      - uses: subosito/flutter-action@v2
        with:
          flutter-version-file: apps/mobile/.fvmrc

      - name: Régénérer les DTOs depuis le contrat OpenAPI backend
        run: dart run build_runner build --delete-conflicting-outputs

      - name: Analyse statique (flutter analyze)
        run: flutter analyze

      - name: Format check
        run: dart format --output=none --set-exit-if-changed .

      - name: Tests unitaires & widgets
        run: flutter test --coverage

      - name: Build (vérifie que l'app compile)
        run: flutter build apk --debug
```

### 4.3 Déploiement

```text
Merge sur main (après CI verte)
   │
   ▼
Auto-déploiement sur STAGING (toujours, à chaque merge)
   │
   ▼
Validation manuelle / recette (AR + EN, RTL)
   │
   ▼
Tag de release (ex. v1.2.0) → déclenche le déploiement PRODUCTION
```

- **Staging** : déploiement automatique sur chaque merge dans `main`, environnement multi-tenant de test avec données fictives.
- **Production** : jamais automatique sur un simple merge — déclenché uniquement par un tag Git (`git tag v1.2.0 && git push --tags`), pour garder un contrôle humain sur le rythme des mises en prod.
- Migrations DB (TypeORM/Prisma) exécutées comme étape distincte du pipeline de déploiement, jamais à la volée au démarrage de l'app en prod.

### 4.4 Branch protection à configurer (GitHub exemple)
- Require pull request before merging
- Require approvals: 1 minimum (2 pour les modules sensibles : `orders`, `vip-self-service`, `quotas`)
- Require status checks to pass: `build-test-node`, `build-test-mobile`
- Require branches to be up to date before merging
- Restrict force pushes
- Require linear history (cohérent avec le squash merge)

---

## 5. Tests & Qualité de code

### 5.1 Pyramide de tests pour Tarhib

```text
        ▲  E2E (peu nombreux, parcours critiques)
       ╱ ╲    → "un employé commande et reçoit sa commande" (intégration / E2E web+mobile)
      ╱   ╲   → "un produit VIP n'apparaît jamais au catalogue"
     ╱─────╲
    ╱       ╲ Intégration (API + DB réelle de test)
   ╱         ╲  → moteur de validation, isolation multi-tenant
  ╱───────────╲
 ╱             ╲ Unitaires & widgets (nombreux, rapides)
╱_______________╲ → logique pure (calcul quota, calcul SLA, mapping DTO)
                   → Flutter : widget tests sur les écrans critiques, golden tests pour le RTL
```

### 5.2 Règles de couverture
- **Le moteur de validation de commande** (rôle → stock → quota) : couverture 100% des branches, c'est une exigence non négociable (voir `CLAUDE.md` §3 et `Guide_Implementation.md` §5).
- Reste du backend : seuil minimum 80% sur les modules `orders`, `quotas`, `inventory`, `vip-self-service`.
- Front web (web admin) : tests de composants React sur les écrans critiques (catalogue, panier) + au moins un test de rendu RTL.
- Front mobile (Flutter) : widget tests sur les écrans critiques (catalogue, panier, file Agent), au moins un golden test par écran clé en mode RTL (arabe) et LTR (anglais).

### 5.3 Git hooks (Husky + lint-staged + commitlint)

```bash
npx husky init
```

`.husky/pre-commit` :
```bash
npx lint-staged
```

`.husky/commit-msg` :
```bash
npx --no -- commitlint --edit "$1"
```

`lint-staged` config (dans `package.json`) :
```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

`commitlint.config.js` :
```js
module.exports = { extends: ["@commitlint/config-conventional"] };
```

### 5.4 Checklist de revue de code (à coller dans le template de PR si besoin)
- [ ] Le filtrage de rôle/type produit est fait côté backend, pas seulement côté UI
- [ ] Aucune notion de "budget" introduite (voir `CLAUDE.md` §3.1)
- [ ] Si la PR touche `orders` ou `quotas` : tests couvrant la matrice de décision présents
- [ ] Aucune chaîne de texte UI en dur (tout passe par i18n)
- [ ] Pas de `any` non justifié en TypeScript
- [ ] Migration DB versionnée si schéma modifié
- [ ] Si un DTO backend (`orders`, `products`, `quotas`...) a changé : client/modèles Dart régénérés depuis OpenAPI dans la même PR (voir §2.1)

---

## 6. Résumé — commandes à connaître par cœur

```bash
# Setup initial (one-time)
git clone git@github.com:<org>/tarhib.git && cd tarhib
nvm use
npm install
npx husky init

# Setup mobile Flutter (one-time, en plus du setup Node ci-dessus)
cd apps/mobile
dart pub global activate fvm
fvm install               # installe la version Flutter pinnée dans .fvmrc
fvm flutter pub get
cd ../..

# Cycle de dev quotidien
git checkout main && git pull
git checkout -b feature/TARHIB-XXX-description
# ... code ...
git add -p && git commit -m "feat(scope): description"
git fetch origin && git rebase origin/main
git push -u origin feature/TARHIB-XXX-description
# → ouvrir la PR, attendre CI verte + review, squash-merge

# Release
git checkout main && git pull
git tag v1.x.0
git push --tags
```
