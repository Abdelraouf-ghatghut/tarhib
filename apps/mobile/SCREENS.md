# Tarhib Mobile — Description des écrans par rôle

> Inventaire exact basé sur le code source (`lib/screens/`, `lib/router.dart`).
> Version : branche `feature/TARHIB-8-32-41-50-rtl-keycloak-stock`

---

## Écran commun à tous les rôles — Connexion (`/login`)

**Fichier :** `lib/screens/auth/login_screen.dart`

### Contenu

- Logo animé (respiration douce, scale 1.0 → 1.06 en boucle)
- Titre "Tarhib" + sous-titre "Connectez-vous à votre espace"
- **Onglet "Mot de passe"**
  - Champ Email (validation non vide)
  - Champ Mot de passe (masqué/visible)
  - Bannière d'erreur si identifiants incorrects
  - Bouton "Se connecter" avec spinner pendant la requête
- **Onglet "OTP"**
  - Champ numéro de téléphone
  - Bouton "Envoyer le code" → appel `POST /auth/otp/request`
  - Champ code OTP (6 chiffres, grand, centré) — apparaît après envoi
  - Lien "Renvoyer le code"
  - Bouton "Vérifier" → appel `POST /auth/otp/verify`

### Redirection après connexion

| Rôle                 | Route cible                           |
| -------------------- | ------------------------------------- |
| `EMPLOYEE`           | `/employee` (Catalogue)               |
| `HOSPITALITY_AGENT`  | `/agent/queue` (File d'attente)       |
| `DEPARTMENT_MANAGER` | `/manager/orders` (Commandes manager) |

---

## Rôle : EMPLOYEE (Employé)

**Routes :** `/employee/*` — Shell commun avec AppBar et barre de navigation inférieure.

### AppBar partagée (toutes les pages employé)

- Salutation dynamique : "Bonjour," / "Bon après-midi," / "Bonsoir," + email de l'utilisateur
- **Badge panier** : compteur flottant cliquable si articles dans le panier (hors onglet panier)
- **Toggle langue** : bouton `ع` / `EN` — bascule entre arabe (RTL) et anglais (LTR) instantanément
- **Icône Salles de réunion** : raccourci vers `/employee/rooms`
- **Icône Profil** : raccourci vers `/profile`

### Barre de navigation inférieure

| Onglet        | Icône                           | Route              |
| ------------- | ------------------------------- | ------------------ |
| Catalogue     | Grille                          | `/employee`        |
| Panier        | Panier + badge nombre articles  | `/employee/cart`   |
| Mes commandes | Reçu + badge commandes EN_COURS | `/employee/orders` |

---

### Écran 1 — Catalogue (`/employee`)

**Fichier :** `lib/screens/employee/catalog_screen.dart`
**Ticket :** TARHIB-12

#### Fonctionnalités

**Recherche**

- Barre de recherche rétractable (icône loupe dans l'AppBar)
- Filtre en temps réel sur `nameAr` ET `nameEn` simultanément
- Champ texte flottant avec résultats mis à jour à chaque frappe

**Filtres par catégorie**

- Chips horizontaux : Boissons 🥤 / Café ☕ / Snacks 🍿 / Repas 🍽️ / Desserts 🍰
- Sélection d'une catégorie filtre la grille ; une deuxième pression désélectionne
- Couleur de chip propre à chaque catégorie

**Grille de produits**

- Grille 2 colonnes, cartes avec effet verre (GlassCard)
- Chaque carte affiche :
  - Icône emoji de catégorie
  - Nom du produit (langue courante : AR ou EN)
  - **Badge quota** : `X / Y` si quota configuré (ex. `3 / 10`)
  - **Bouton "Ajouter"** ou **`0 / Y`** si quota épuisé (bouton désactivé)

**Fiche produit (bottom sheet)**

- S'ouvre au tap sur la carte
- Nom complet bilingue (AR + EN)
- Catégorie avec couleur
- Quota restant sur la période
- Sélecteur de quantité (stepper +/-)
- Bouton "Ajouter au panier" avec retour haptique

**État vide**

- Illustration + message si aucun produit disponible

**Skeleton loader**

- Grille animée pendant le chargement de l'API

---

### Écran 2 — Panier (`/employee/cart`)

**Fichier :** `lib/screens/employee/cart_screen.dart`
**Tickets :** TARHIB-13, TARHIB-14

#### Fonctionnalités

**Liste des articles**

- Chaque ligne : nom produit (AR/EN), quantité, bouton retirer
- Modification de quantité directement dans la liste

**Note de commande**

- Champ texte extensible "Ajouter une note" (ex. "Sans sucre")
- Mémorisé dans le provider jusqu'à soumission

**Bouton "Confirmer & Envoyer"**

- Ouvre un **bottom sheet de confirmation** avec :
  - Nombre total d'articles
  - Priorité estimée (déduite du rôle)
  - Récapitulatif des lignes
  - Bouton final de validation

**Soumission**

- Appel `POST /orders`
- Retour haptique (impact moyen) à la confirmation
- Spinner pendant la requête

**Résultat ligne par ligne**

- Après soumission, affiche deux sections séparées :
  - ✅ **Lignes acceptées** (fond vert)
  - ❌ **Lignes rejetées** avec raison traduite :
    - `PRODUCT_NOT_COMMANDABLE` → "Produit non commandable"
    - `ROLE_NOT_ALLOWED` → "Rôle non autorisé"
    - `INSUFFICIENT_STOCK` → "Stock insuffisant"
    - `QUOTA_EXCEEDED` → "Quota dépassé"
- Animation de succès (scale elasticOut) si au moins une ligne acceptée
- Le panier est vidé automatiquement après soumission réussie

**État vide**

- Illustration + message si panier vide

---

### Écran 3 — Mes commandes / Historique (`/employee/orders`)

**Fichier :** `lib/screens/employee/history_screen.dart`
**Ticket :** TARHIB-16

#### Fonctionnalités

**Filtres de statut**

- Chips : Tout / En cours / Livré / Rejeté
- Filtre appliqué localement sur la liste chargée

**Liste des commandes**

- Chaque carte affiche :
  - Numéro de commande (8 premiers caractères de l'UUID)
  - Date formatée (locale courante)
  - Priorité colorée (P1 rouge → P5 gris)
  - Statut avec pastille couleur
  - Nombre de lignes

**Actions par commande**

- **Tap sur la carte** → navigation vers le suivi en temps réel (`/employee/orders/:id`)
- **Bouton "Récommander"** (icône recyclage) sur les commandes livrées :
  - Boîte de dialogue de confirmation
  - Recharge tous les articles dans le panier
  - Snackbar de confirmation

**Skeleton loader**

- Liste animée pendant le chargement

**État vide**

- Illustration adaptée au filtre actif

---

### Écran 4 — Suivi de commande (`/employee/orders/:id`)

**Fichier :** `lib/screens/employee/order_tracking_screen.dart`
**Ticket :** TARHIB-15

#### Fonctionnalités

**Stepper de statut**

- 4 étapes visuelles : PENDING → APPROVED → IN_PROGRESS → DELIVERED
- Étape courante mise en évidence
- Cas rejeté : affichage d'une icône d'erreur rouge à la place du stepper

**Informations de commande**

- Priorité
- Date limite SLA (formatée en heure locale)

**Compte à rebours SLA en temps réel**

- Minuteur `⏱ X m Y s` qui se décrémente chaque seconde
- Couleur verte (> 5 min) → orange (< 5 min) → rouge (expiré)
- Affiche "Délai dépassé" quand le SLA est expiré
- Arrêté quand statut = DELIVERED ou REJECTED

**Lignes de commande**

- Liste des produits avec quantité et statut de validation

**Auto-refresh**

- Polling automatique toutes les 15 secondes tant que la commande n'est pas terminée

---

### Écran 5 — Salles de réunion (`/employee/rooms`)

**Fichier :** `lib/screens/employee/meeting_rooms_screen.dart`

#### Fonctionnalités

**Navigation par onglets** (TabBar dans la GlassAppBar)

- Onglet **Disponibles**
- Onglet **Mes réservations**

**Onglet Disponibles**

- Liste des salles avec :
  - Nom de la salle
  - Capacité (nombre de personnes)
  - Statut : "Disponible" (vert) / "Occupée" (rouge)
- Bouton **"Réserver"** sur les salles disponibles :
  - Sélecteur d'heure de début (TimePicker)
  - Sélecteur d'heure de fin
  - Appel `POST /meeting-rooms/bookings`
  - Snackbar "Réservation confirmée"
- État vide si aucune salle

**Onglet Mes réservations**

- Liste des réservations de l'utilisateur connecté
- Chaque carte : nom salle, heure début – heure fin
- Bouton **"Annuler"** sur chaque réservation
  - Appel `DELETE /meeting-rooms/bookings/:id`
- État vide si aucune réservation

---

## Rôle : HOSPITALITY_AGENT (Agent d'Hospitalité)

**Routes :** `/agent/*` — Pas de shell, chaque écran a sa propre AppBar.

---

### Écran 1 — File d'attente (`/agent/queue`)

**Fichier :** `lib/screens/agent/queue_screen.dart`
**Ticket :** TARHIB-17

#### Fonctionnalités

**Auto-refresh**

- SLA recalculé chaque seconde (Timer.periodic 1s)
- Liste rafraîchie toutes les 30 secondes

**Filtres**

- **Par priorité** : chips P1 🔴 / P2 🟠 / P3 🟡 / P4 🔵 / P5 ⚪
- **Par statut** : Tout / PENDING / APPROVED / IN_PROGRESS

**Sélection multiple**

- Bouton "Sélectionner" active le mode multi-sélection
- Checkboxes sur chaque carte
- Bouton "Tout sélectionner"
- Compteur d'éléments sélectionnés dans l'AppBar

**Actions groupées** (barre flottante quand sélection > 0)

- **"Démarrer tout"** → passe toutes les commandes sélectionnées à IN_PROGRESS
- **"Livrer tout"** → passe toutes les commandes sélectionnées à DELIVERED

**Carte commande**

- Priorité colorée + emoji
- Nom de l'employé + département
- Heure SLA limite
- Compte à rebours coloré (vert / orange / rouge / "En retard")
- Nombre d'articles

**Navigation vers détail**

- Tap sur une carte → `AgentOrderDetailScreen`
- Le provider `queueNavProvider` mémorise la liste ordonnée pour navigation précédent/suivant

**Bouton VIP Stock**

- Icône dans l'AppBar → `/agent/vip-stock`

**Skeleton loader**

- Cartes animées pendant le chargement initial

---

### Écran 2 — Détail commande agent (`/agent/orders/:id`)

**Fichier :** `lib/screens/agent/order_detail_screen.dart`
**Tickets :** TARHIB-18, TARHIB-19

#### Fonctionnalités

**Navigation précédent / suivant**

- Flèches dans l'AppBar pour naviguer dans la file sans revenir à la liste

**Informations commande**

- Statut actuel, priorité, SLA deadline
- Nom de l'employé, département

**Liste des lignes**

- Produit + quantité + statut de validation par ligne

**Actions principales**

- **"Démarrer préparation"** (statut PENDING/APPROVED → IN_PROGRESS)
- **"Marquer livré"** (statut IN_PROGRESS → DELIVERED)
- Retour haptique sur chaque action
- Bouton désactivé si action non applicable à l'état courant

**Signalement rupture de stock**

- Bouton "Rupture de stock" sur chaque ligne
- Boîte de dialogue de confirmation
- Appel API `PATCH /orders/:id/lines/:lineId/out-of-stock`
- Snackbar "Signalement enregistré"

**Photo de livraison**

- Section dédiée lors de la livraison
- Bouton "Prendre une photo" (ImagePicker, caméra, qualité 80%, max 1280px)
- Prévisualisation de la photo capturée
- Upload en `multipart/form-data` vers `POST /orders/:id/delivery-photo`
- Indicateur de progression pendant l'upload

---

### Écran 3 — Stock VIP (`/agent/vip-stock`)

**Fichier :** `lib/screens/agent/vip_stock_screen.dart`

#### Fonctionnalités

**Filtres**

- **Tous les emplacements**
- **Sous le seuil** — filtre uniquement les emplacements en alerte

**Liste des emplacements VIP**

- Nom de l'emplacement (ex. "Frigo — Bureau CFO")
- Produit associé
- Stock actuel / seuil min / seuil max
- Indicateur rouge si stock < seuil minimum

**Détail d'emplacement** (bottom sheet)

- Nom + produit
- Jauge visuelle `stock actuel (min X / max Y)`
- Seuil d'alerte
- Bouton **"Marquer comme réapprovisionné"** :
  - Boîte de dialogue de confirmation
  - Appel `PATCH /vip-self-service/locations/:id/replenish`
  - Actualisation de la liste

**État vide**

- Message si aucun emplacement VIP configuré

---

## Rôle : DEPARTMENT_MANAGER (Manager de département)

**Routes :** `/manager/*` — Pas de shell, chaque écran a sa propre AppBar.

---

### Écran 1 — Liste des commandes (`/manager/orders`)

**Fichier :** `lib/screens/manager/manager_orders_screen.dart`
**Ticket :** TARHIB-20

#### Fonctionnalités

**AppBar**

- Bouton dashboard → `/manager/dashboard`
- Bouton profil → `/profile`

**Liste des commandes en attente d'approbation**

- Source : `GET /orders?status=PENDING_APPROVAL`
- Chaque carte affiche :
  - ID commande (8 caractères)
  - Email de l'employé
  - Date
  - Priorité colorée (P1 rouge → P5 gris)
  - Nombre de lignes

**Actions par commande**

- **Bouton "Approuver"** (vert) → `PATCH /orders/:id/status` → `APPROVED`
- **Bouton "Rejeter"** (rouge) → `PATCH /orders/:id/status` → `REJECTED`
- Retour haptique sur chaque action
- Snackbar d'erreur si l'appel échoue
- La carte disparaît de la liste après décision

**Tap sur carte** → `ManagerOrderDetailScreen` pour voir le détail avant décision

**Skeleton loader**

- Cartes animées pendant le chargement

**État vide**

- Illustration + message si aucune commande en attente

---

### Écran 2 — Détail commande manager (`/manager/orders/:id`)

**Fichier :** `lib/screens/manager/manager_order_detail_screen.dart`

#### Fonctionnalités

**Informations commande**

- ID, statut, priorité, SLA deadline
- Email de l'employé (via `order.employeeId`)
- Date de création

**Lignes de commande**

- Produit + quantité + statut de validation (accepté / rejeté + raison)

**Quotas de l'employé** (panneau collapsible)

- Liste de tous les quotas de l'employé pour cette période
- Chaque quota : nom du produit + `utilisé / maximum`

**Actions d'approbation** (si statut PENDING_APPROVAL)

- Bouton "Approuver" + bouton "Rejeter"
- Identiques aux actions de la liste

---

### Écran 3 — Dashboard (`/manager/dashboard`)

**Fichier :** `lib/screens/manager/manager_dashboard_screen.dart`

#### Fonctionnalités

**4 métriques clés** (source : `GET /orders/dashboard/stats`)

| Métrique            | Description                                  |
| ------------------- | -------------------------------------------- |
| Commandes du jour   | Nombre total de commandes créées aujourd'hui |
| En attente          | Nombre de commandes PENDING                  |
| Livrées aujourd'hui | Nombre de commandes DELIVERED aujourd'hui    |
| SLA moyen           | Durée moyenne de traitement en minutes       |

**Produits les plus commandés**

- Liste des 5 produits les plus commandés sur la période
- Nom + nombre de commandes

> Note : en cas d'erreur API, le dashboard affiche les compteurs à 0 sans planter.

**Bouton retour** → `/manager/orders`

---

## Écran commun — Profil (`/profile`)

**Fichier :** `lib/screens/profile/profile_screen.dart`
**Accessible depuis :** tous les rôles (icône profil dans l'AppBar)

### Fonctionnalités

**Avatar**

- Initiales générées depuis l'email (ex. `sarah.benali@…` → `SB`)
- Cercle glassmorphique

**Informations utilisateur**

- Email complet
- Rôle traduit : "Employé" / "Agent d'Hospitalité" / "Département Manager" / "Admin"

**Préférences**

_Langue_

- Sélecteur : Arabe (العربية) / English
- Changement immédiat + bascule RTL/LTR de toute l'interface

_Thème_

- 3 options : Système / Clair / Sombre
- Appliqué instantanément sans redémarrage

**Déconnexion**

- Bouton "Se déconnecter" (rouge) en bas de page
- Vide le token, redirige vers `/login`

---

## Composants transversaux

### GlassAppBar

AppBar translucide avec effet de flou (backdrop blur, sigmaX/Y = 18).
Supporte : `title`, `leading`, `actions`, `bottom` (TabBar).
Couleur adaptée dark/light mode. Désactivé si `highContrast` = true (accessibilité).

### GlassCard

Carte avec fond semi-transparent et bord lumineux.
Paramètres : `padding`, `borderRadius`, `child`.

### GlassNavBar

Barre de navigation inférieure translucide. Utilisée uniquement pour le rôle Employé.

### ErrorCard

Affichée en cas d'erreur API sur tous les écrans.

- Message d'erreur
- Bouton "Réessayer" qui réinvalide le provider Riverpod
- `margin` configurable

### SkeletonLoader

Animations de chargement pour :

- `CatalogSkeletonGrid` — grille 2 colonnes
- `OrderCardSkeleton` — carte de commande
- `QueueCardSkeleton` — carte de file d'attente

### OrderLineTile

Tuile réutilisée dans order_tracking, agent_order_detail, manager_order_detail.
Affiche : nom du produit (via cache), quantité, statut de validation.

### EmptyState

Widget illustré pour les états vides.
Types : `catalog` / `orders` / `queue` / `rooms`.
Supporte `title` et `subtitle` optionnels.

---

## Architecture de navigation (GoRouter)

```
/login                          ← tous (non authentifié)
/employee                       ← EMPLOYEE (shell)
  /employee/cart
  /employee/orders
  /employee/orders/:id
  /employee/rooms
/agent/queue                    ← HOSPITALITY_AGENT
  /agent/orders/:id
  /agent/vip-stock
/manager/orders                 ← DEPARTMENT_MANAGER
  /manager/orders/:id
  /manager/dashboard
/profile                        ← tous les rôles authentifiés
```

**Redirection automatique** : si non connecté → `/login` ; si connecté sur `/login` → route cible selon le rôle.

---

## Ce qui n'est pas encore branché côté API (stubs UI)

| Écran              | Fonctionnalité                  | Statut                                                             |
| ------------------ | ------------------------------- | ------------------------------------------------------------------ |
| Meeting rooms      | Liste des salles / réservations | API `/meeting-rooms` à implémenter côté backend                    |
| VIP Stock          | Emplacements VIP                | API `/vip-self-service/locations` à implémenter                    |
| Dashboard manager  | Stats                           | API `/orders/dashboard/stats` à implémenter                        |
| Agent order detail | Upload photo livraison          | API `/orders/:id/delivery-photo` à implémenter                     |
| Login OTP          | Envoi/vérification OTP          | API `/auth/otp/*` — implémentée, Twilio en mode mock si pas de clé |
