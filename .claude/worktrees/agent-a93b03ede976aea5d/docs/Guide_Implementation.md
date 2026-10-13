# Guide d'Implémentation — Tarhib
## Plateforme de Gestion Hospitalité Corporate

**Version :** 1.0
**Objectif :** servir de feuille de route technique pour passer de la spécification fonctionnelle à un produit livré, par phases.

---

## 1. Principes directeurs

- **Monolithe modulaire d'abord, micro-services ensuite si besoin.** NestJS permet de découper proprement par modules métier sans payer le coût opérationnel de micro-services dès le jour 1. Re-découper en services séparés seulement si un module précis (ex. `notifications` ou `kitchen` temps réel) devient un goulot d'étranglement identifié.
- **Le moteur de validation de commande est le cœur du système.** Il doit être développé, testé et durci avant toute fonctionnalité périphérique (rapports, dashboards).
- **RTL et i18n dès le premier écran**, jamais en rattrapage final — c'est sous-estimé et coûteux à corriger après coup.
- **Multi-tenant dès le schéma de données initial**, même si le premier client est unique au lancement.

---

## 2. Architecture technique

### 2.1 Vue d'ensemble

```text
┌─────────────────┐     ┌─────────────────┐
│ App Mobile Flutter│     │  Web Admin React │
│ (Employé / Agent)│     │ (rôles gestion)  │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         └──────────┬─────────────┘
                     ▼
            ┌──────────────────┐
            │   API Gateway     │  (auth, rate limiting, routage)
            └────────┬──────────┘
                     ▼
       ┌─────────────────────────────┐
       │     Backend NestJS           │
       │  (modules métier, §4 CLAUDE.md)│
       └───────┬──────────┬──────────┘
               ▼          ▼
        ┌───────────┐ ┌─────────┐
        │ PostgreSQL │ │  Redis  │
        └───────────┘ └─────────┘
               │
               ▼
        ┌───────────────┐
        │  Socket.io     │ → push temps réel (statuts, SLA, alertes)
        └───────────────┘
```

### 2.2 Stratégie multi-tenant

- Toutes les tables métier portent une colonne `company_id` (tenant).
- Isolation au niveau applicatif (middleware qui injecte automatiquement le filtre `company_id` sur chaque requête, basé sur le tenant résolu depuis le JWT) — **pas** d'isolation par schéma séparé au départ, pour limiter la complexité opérationnelle. Réévaluer si un client exige une isolation physique stricte (contrat spécifique).
- Index composites systématiques sur `(company_id, ...)` pour les tables à fort volume (orders, inventory_movements).

### 2.3 Modèle de données — entités clés

```text
Company (tenant)
  └── Branch
        ├── Department
        │     └── Employee
        ├── MeetingRoom
        ├── StockLocation (type: BRANCH | VIP_OFFICE)
        │     └── StockItem (product_id, location_id, quantity, min_threshold, max_threshold)
        └── Order
              ├── OrderLine (product_id, quantity, status)
              ├── priority (P1-P5, dérivé du rôle employé)
              ├── sla_deadline
              └── status (created, validated, pending_approval, rejected,
                          in_preparation, in_delivery, delivered, closed)

Product
  ├── type (COMMANDABLE | LIBRE_SERVICE_VIP)
  ├── category
  ├── allowed_roles[] (si restriction de rôle sur un produit commandable)
  └── supplier_id

Quota
  ├── scope (PRODUCT | EMPLOYEE | DEPARTMENT | BRANCH | COMPANY)
  ├── period (DAILY | WEEKLY | MONTHLY)
  └── limit_value

ReplenishmentTask (spécifique au libre-service VIP)
  ├── stock_location_id
  ├── triggered_at
  ├── status (PENDING, DONE)
  └── assigned_to (Agent d'Hospitalité / Inventory Manager)

PurchaseOrder (Procurement)
  ├── supplier_id
  ├── status (draft, submitted, approved, ordered, received, closed)
  └── lines[]
```

Points d'attention :
- `Order` et `ReplenishmentTask` sont **deux entités distinctes**, pas une variante l'une de l'autre — elles n'ont ni le même cycle de vie ni les mêmes champs (pas de priorité/SLA/quota sur une tâche de réappro).
- `StockItem` est rattaché à un `StockLocation`, qui peut être une branche entière ou un emplacement VIP unique — c'est cette indirection qui permet de gérer les frigos VIP sans dupliquer la logique de stock.

---

## 3. Phasage du développement

### Phase 0 — Socle technique (2-3 semaines)
- Setup monorepo (Nx ou Turborepo) pour le backend NestJS et le web admin React ; app mobile Flutter gérée dans `apps/mobile` avec son propre tooling Dart/Flutter (pub, FVM), orchestrée depuis la CI globale mais hors du graphe de tâches Nx/Turborepo (voir `Guide_Git_CICD.md` §2)
- CI/CD de base (lint, build, tests, déploiement staging)
- Auth (Keycloak) + RBAC de base
- i18n FR... non, AR/EN + RTL configuré dès le squelette d'écran
- Modèle multi-tenant (Company, Branch, Department, Employee) + CRUD admin

**Critère de sortie :** un admin peut créer une société, une branche, un département, un employé, et se connecter avec un rôle donné.

### Phase 1 — Catalogue, Stock, Commande (4-6 semaines) — **cœur du produit**
- Module Produits (catalogue, catégories, type commandable/libre-service, visibilité par rôle)
- Module Stock (par branche + StockLocation VIP), seuils, alertes
- **Moteur de validation de commande** (rôle → stock → quota), avec tests unitaires exhaustifs sur la matrice de décision
- Module Quotas (configuration + suivi consommation)
- Écran catalogue employé (style Uber Eats) + panier + soumission
- File d'attente Agent d'Hospitalité (sans encore la priorité/SLA avancée — statuts simples d'abord)

**Critère de sortie :** un employé peut commander un produit commandable, voir le résultat du moteur de validation en direct, et un agent peut faire évoluer le statut jusqu'à "livré".

### Phase 2 — Priorité, SLA, Salles de réunion (3-4 semaines)
- Moteur de priorité (P1-P5) + calcul SLA dynamique
- Dashboard Agent avec compte à rebours SLA temps réel (Socket.io)
- Module Salles de réunion (réservation + service hospitalité associé)
- Notifications temps réel (commande, SLA, quota)

### Phase 3 — Libre-service VIP, Achats, Transferts (3-4 semaines)
- Module `vip-self-service` complet : emplacements VIP, seuils, `ReplenishmentTask`
- Module Procurement (bons de commande fournisseurs, workflow d'approbation)
- Transferts de stock inter-branches

### Phase 4 — Reporting, Dashboards, Audit (2-3 semaines)
- Rapports opérationnels/inventaire/achats/hospitalité/SLA
- Dashboards exécutif et branche
- Piste d'audit complète

### Phase 5 — Durcissement & lancement (2-3 semaines)
- Tests de charge (file d'attente cuisine, pics de commande)
- Mode offline mobile pour l'Agent d'Hospitalité (Flutter, persistance locale Drift/SQLite ou Hive, synchronisation à la reconnexion)
- Revue sécurité (RBAC, isolation tenant, chiffrement)
- Recette métier complète AR + EN, RTL

**Durée totale estimée : ~16-23 semaines** selon taille d'équipe (hypothèse : 1 lead + 2-3 devs backend + 2 devs mobile + 1 dev web admin + 1 QA).

---

## 4. API — structure des endpoints (extrait représentatif)

```text
POST   /auth/login
POST   /auth/otp/verify

GET    /catalog/products              # filtré automatiquement par rôle + type=COMMANDABLE
POST   /orders                        # déclenche le moteur de validation
GET    /orders/:id
PATCH  /orders/:id/status             # côté Agent d'Hospitalité

GET    /stock/locations/:id
POST   /stock/locations/:id/movements

GET    /vip-locations                 # emplacements VIP sous le périmètre de l'agent
POST   /vip-locations/:id/replenish    # confirmation de réapprovisionnement

GET    /quotas/employee/:id/remaining

POST   /meeting-rooms/:id/requests

GET    /reports/operational
GET    /dashboards/executive
```

Toutes les routes `catalog/*` et `orders/*` appliquent le filtre de rôle **côté serveur** (middleware/guard dédié), conformément à la règle §3 du `CLAUDE.md`.

---

## 5. Tests — priorités

1. **Moteur de validation de commande** : tests unitaires couvrant toutes les combinaisons de la matrice de décision (disponible/indisponible × quota OK/dépassé × config rejet strict/approbation)
2. **Filtrage catalogue par rôle** : test d'intégration vérifiant qu'un produit `libre_service_vip` n'est JAMAIS retourné par l'API catalogue, quel que soit le rôle appelant
3. **Flux de réapprovisionnement VIP** : test du déclenchement d'alerte au franchissement du seuil, et de la non-génération d'entrée dans la file de commandes
4. **Isolation multi-tenant** : test garantissant qu'une requête authentifiée pour le tenant A ne peut jamais retourner de données du tenant B
5. **SLA temps réel** : test de calcul du temps restant et du changement de statut visuel (vert/orange/rouge)

---

## 6. Risques identifiés & mitigation

| Risque | Mitigation |
|---|---|
| Sous-estimation du RTL (mise en page, dates, icônes) | Prototyper l'écran catalogue en RTL dès la Phase 0, pas en fin de projet |
| Confusion entre Order et ReplenishmentTask en cours de dev | Modèles de données et endpoints strictement séparés dès le départ (voir §2.3) |
| Dérive vers une notion de "budget" réintroduite par erreur | Revue de code systématique sur les modules quotas/orders, référence explicite au CLAUDE.md §3 |
| Charge cuisine en pic (heures de pointe café du matin) | Tester la file Redis/Socket.io sous charge avant la Phase 5 |
| Stock VIP désynchronisé de la réalité physique (consommation hors app) | Accepter l'imprécision inhérente (le système ne peut pas tracer une consommation manuelle) ; fiabiliser uniquement le déclenchement d'alerte sur seuil et la confirmation manuelle de réapprovisionnement |
