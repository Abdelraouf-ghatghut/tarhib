# Guide MVP — Tarhib
## Première Version Livrable

**Objectif :** livrer une première version utilisable en conditions réelles, centrée sur 3 capacités : **Commander**, **Suivre sa consommation (quota)**, **Gérer le stock**. Tout le reste est volontairement repoussé.

---

## 1. Périmètre du MVP

### ✅ Inclus
- Authentification simple (email/mot de passe + OTP)
- Structure minimale : Société → Branche → Département → Employé (CRUD admin basique, pas de configuration avancée)
- Catalogue produits avec catégories, type `commandable` uniquement (le libre-service VIP est hors scope MVP — voir §3)
- Visibilité produit par rôle (filtrage backend)
- Stock par branche (entrée/sortie/ajustement, seuils, alerte rupture)
- Commande employé (instantanée uniquement, pas de programmée/groupée/salle de réunion)
- **Moteur de validation automatique** : rôle → stock → quota (les 3 contrôles définis précédemment), sans la couche priorité/SLA
- Quotas par produit/employé, période jour/semaine/mois, avec suivi de consommation visible par l'employé
- File d'attente simple côté Agent d'Hospitalité (statuts : reçue → en préparation → livrée), sans priorité ni SLA chronométré
- Historique de commandes employé
- Notifications basiques (push : commande acceptée / livrée / quota atteint)
- AR/EN + RTL dès le départ (non négociable, voir Guide d'Implémentation §1)

### ❌ Explicitement hors scope MVP (renvoyé en V2+)
- Priorité (P1-P5) et SLA chronométrés
- Salles de réunion
- Produits VIP en libre-service + réapprovisionnement par emplacement
- Achats/Procurement, fournisseurs, transferts inter-branches
- Commandes programmées et commandes groupées
- Reporting avancé et dashboards exécutifs (un export simple suffit, voir §5)
- Audit trail détaillé (logs techniques basiques seulement)
- SSO Azure AD / Google

> Règle de scope : si une demande pendant le développement ne sert pas directement "commander", "suivre sa consommation" ou "gérer le stock", elle va dans le backlog V2, pas dans le MVP.

---

## 2. Modèle de données MVP (réduit)

```text
Company
  └── Branch
        ├── Department
        │     └── Employee (role: EMPLOYEE | HOSPITALITY_AGENT | ADMIN)
        └── StockItem (product_id, branch_id, quantity, min_threshold)

Product
  ├── category
  ├── allowed_roles[]  (optionnel, vide = tous rôles)
  └── active (bool)

Quota
  ├── product_id (optionnel, null = quota global produit-agnostique — garder simple : commencer par quota PAR PRODUIT uniquement en MVP)
  ├── employee_id ou department_id (scope minimal au choix, recommandé : employee_id pour le MVP)
  ├── period (DAILY | WEEKLY | MONTHLY)
  └── limit_value

Order
  ├── employee_id, branch_id
  ├── status (created, validated, pending_approval, rejected, in_preparation, delivered)
  └── lines[] (product_id, quantity)
```

Volontairement absent du MVP : `StockLocation` (VIP), `ReplenishmentTask`, `MeetingRoom`, `PurchaseOrder`, `priority`, `sla_deadline`. Ces entités seront ajoutées en V2 sans casser ce socle si le modèle ci-dessus est respecté dès le départ.

---

## 3. Pourquoi exclure le libre-service VIP du MVP (et comment ne pas se bloquer pour la V2)

Le libre-service VIP n'a aucune dépendance avec le flux de commande — c'est uniquement du stock + alerte. On peut donc le développer plus tard sans rien casser, **à condition de** :
- Prévoir dès le MVP un champ `type` sur `Product` (`commandable` par défaut), même si une seule valeur est utilisée pour l'instant
- Ne pas câbler en dur l'hypothèse "tout produit = commandable" dans le moteur de validation (le check de type doit déjà exister, juste avec une seule branche possible)

Ça évite une migration de données douloureuse en V2.

---

## 4. Écrans MVP

### Employé (mobile)
1. **Connexion**
2. **Catalogue** — liste par catégorie, indicateur "Indisponible" si rupture, indicateur quota restant, bouton "+"
3. **Panier** — multi-produits, résultat du moteur de validation affiché en direct (validé / en attente d'approbation / rejeté)
4. **Suivi de commande** — statut simple (reçue → en préparation → livrée), pas de chronomètre SLA
5. **Historique** — liste des commandes passées
6. **Quota** — écran ou carte dédiée montrant la consommation par produit sur la période en cours

### Agent d'Hospitalité (mobile/tablette)
1. **Connexion**
2. **File de commandes** — liste simple triée par heure de création (pas de priorité en MVP), bouton de changement de statut
3. **Détail commande** — articles + bouton "Signaler rupture" (alimente le stock)

### Admin (web)
1. **Gestion société/branche/département/employé** — CRUD basique
2. **Gestion produits** — CRUD + catégories + rôles autorisés
3. **Gestion stock** — entrée/sortie/ajustement + seuils
4. **Configuration quotas** — par produit/employé, période
5. **Export simple** (CSV) des commandes et de la consommation — remplace le reporting avancé pour le MVP

---

## 5. Plan de sprints (proposition, sprints de 2 semaines)

| Sprint | Contenu | Sortie |
|---|---|---|
| 1 | Setup technique, auth, structure Société/Branche/Département/Employé | Admin peut créer la structure et se connecter |
| 2 | Catalogue produits + visibilité par rôle + stock par branche (CRUD + seuils) | Catalogue affiché correctement filtré, stock gérable en admin |
| 3 | Moteur de validation (rôle → stock → quota) + module Quotas | Tests unitaires du moteur validés sur toute la matrice de décision |
| 4 | Écran commande employé (catalogue → panier → soumission) + écran suivi | Un employé peut passer une commande et voir le résultat de la validation |
| 5 | File d'attente Agent d'Hospitalité + changement de statut + notifications de base | Une commande peut être traitée de bout en bout par un agent |
| 6 | Écran quota/consommation employé + export CSV admin + durcissement RTL/AR-EN | Recette fonctionnelle complète, bug fixing |

**Durée estimée : 10-12 semaines** avec une équipe réduite (1 backend, 1 mobile, 1 fullstack/admin web, partagé avec QA).

---

## 6. Definition of Done du MVP

Le MVP est considéré livrable quand :
- [ ] Un employé voit uniquement les produits commandables autorisés pour son rôle
- [ ] Une commande déclenche le moteur de validation (rôle → stock → quota) et le résultat est correct dans tous les cas de la matrice
- [ ] Un produit en rupture de stock est visiblement indisponible et non commandable
- [ ] L'employé voit sa consommation par produit sur la période en cours, qui se met à jour après chaque commande validée
- [ ] Un agent peut faire passer une commande par tous les statuts jusqu'à "livrée"
- [ ] L'interface fonctionne correctement en arabe (RTL) et en anglais (LTR)
- [ ] L'admin peut gérer société/branche/département/employé/produit/stock/quota sans intervention technique

## 7. Backlog V2 (rappel, à ne pas anticiper dans le MVP)

Priorité/SLA · Salles de réunion · Libre-service VIP & réapprovisionnement · Procurement/fournisseurs · Transferts inter-branches · Commandes programmées/groupées · Reporting & dashboards avancés · Audit trail complet · SSO
