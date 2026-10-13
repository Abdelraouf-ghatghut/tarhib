# Description Fonctionnelle & UI — Tarhib
## Parcours "Employé" et "Agent d'Hospitalité"

---

# PARTIE 1 — PROFIL EMPLOYÉ

## 1.1 Rôle fonctionnel

L'Employé est un utilisateur final qui consomme les services hospitalité de son entreprise : il commande des boissons/snacks/repas pour lui-même ou pour une réunion, dans la limite de ses quotas, et suit ses commandes en temps réel. Il n'a accès qu'aux données de sa propre société/branche/département.

## 1.2 Fonctionnalités

- Authentification (email/mot de passe, OTP, SSO futur)
- Consultation du catalogue produits (filtré selon les produits disponibles dans sa branche)
- Passation de commande individuelle, programmée, ou pour salle de réunion
- Visualisation de son quota restant (ex : 2 cafés/jour)
- Suivi en temps réel du statut de sa commande
- Historique de ses commandes
- Réservation de salle de réunion + demande de service hospitalité associée
- Réception de notifications (commande acceptée, livrée, quota atteint)
- Demande d'approbation si dépassement de quota (envoyée au Department Manager)
- Gestion de son profil et préférence de langue (AR/EN)

## 1.3 Écrans UI

### Écran 1 — Accueil / Tableau de bord employé
- Bandeau supérieur : nom, photo, badge de priorité (si VIP/Exécutif), sélecteur de langue (AR/EN, bascule RTL/LTR instantanée)
- Carte "Quota du jour" : ex. barre de progression "1/2 cafés consommés"
- Bouton principal flottant **"+ Nouvelle commande"**
- Section "Commandes en cours" avec statut visuel (badge coloré : En préparation / En livraison / Livrée)
- Raccourci "Réserver une salle de réunion"
- Icône notifications (badge avec compteur)

### Écran 2 — Catalogue produits (style Uber Eats / Deliveroo)
- Affichage organisé **par catégorie**, chaque catégorie présentée en section horizontale scrollable (carrousel) ou en bloc vertical type "feed" : Café, Thé, Boissons chaudes, Eau, Snacks, Sandwichs, Repas... avec bandeau de filtres/chips en haut pour sauter directement à une catégorie
- Grille/liste de cartes produit : image, nom (AR/EN selon langue active), description courte, bouton "+" pour ajouter directement à la commande (sans changer d'écran, comme sur Uber Eats)
- **Seuls les produits commandables et autorisés pour le rôle de l'employé connecté sont affichés** (filtrage côté backend, pas un simple masquage visuel, pour éviter toute commande détournée via l'API). **Les produits VIP en libre-service n'apparaissent jamais dans ce catalogue, pour aucun rôle** : ces produits sont déjà mis à disposition physiquement (frigo/bureau VIP) et ne se commandent pas via l'application — ils ne sont suivis que côté stock (voir 2.2-bis dans la partie Agent d'Hospitalité)
- Indicateur visuel si un produit est en rupture de stock dans sa branche : carte grisée/assombrie, badge **"Indisponible"** ou **"Rupture de stock"**, bouton "+" désactivé (pas de clic possible)
- Indicateur de quota restant directement sur la carte produit (ex. badge "2 restants aujourd'hui") ; si le quota du produit est déjà atteint, la carte passe dans un état "Quota atteint" — visible mais non-sélectionnable
- **Sélection multiple** : l'employé peut ajouter plusieurs produits différents dans une même commande ; chaque ajout déclenche une vérification en direct du quota disponible pour ce produit (compteur qui se met à jour à chaque "+"). Dès qu'un produit atteint son quota individuel pendant la composition du panier, son bouton "+" se désactive immédiatement sans bloquer l'ajout des autres produits

### Écran 3 — Panier / Récapitulatif de commande
- Liste des articles ajoutés (quantité ajustable +/-), un même panier peut contenir **plusieurs produits différents**, chacun limité indépendamment par son propre quota restant
- Sélecteur de type de commande : Instantanée / Programmée (date+heure) / Pour une salle de réunion (sélection de salle)
- Au clic sur "Confirmer", le panier est soumis au **moteur de validation automatique** (voir 1.3-bis ci-dessous) ; le résultat s'affiche en direct sur cet écran :
  - ✅ **Validation automatique** → confirmation immédiate, la commande part en file pour l'Agent d'Hospitalité
  - 🔒 **Approbation requise** → bouton "Confirmer" devient "Envoyer pour approbation", la commande reste en statut "En attente de validation" jusqu'à la décision du Department Manager
  - ❌ **Rejet automatique** (ex. produit en rupture détectée entre l'ajout au panier et la confirmation, ou quota dépassé) → ligne concernée surlignée en rouge avec message explicite, retrait obligatoire ou remplacement avant de pouvoir re-soumettre
- Bouton "Confirmer la commande"

### 1.3-bis — Moteur de Validation Automatique des Commandes

Ce moteur s'exécute côté backend à chaque tentative de soumission de panier (et déjà partiellement en amont, à chaque ajout d'article, pour le feedback temps réel du catalogue). Il évalue **chaque ligne du panier indépendamment**, puis agrège un résultat global.

**Pour chaque produit du panier, le moteur vérifie dans l'ordre :**

1. **Disponibilité produit** — le produit est-il actif et le rôle de l'employé l'autorise-t-il ? (sécurité : revérifié côté serveur même si déjà filtré côté UI)
2. **Stock disponible** — la quantité demandée est-elle disponible dans le stock de la branche au moment de la validation ? (le stock peut avoir changé entre l'ouverture du catalogue et la confirmation)
3. **Quota produit** — la quantité demandée, ajoutée à la consommation déjà enregistrée sur la période (jour/semaine/mois), dépasse-t-elle le quota autorisé pour ce produit/cet employé ? (quota évalué par produit, par employé/département/branche/société selon configuration)

**Décision finale (agrégée sur l'ensemble du panier) :**

| Cas | Résultat |
|---|---|
| Toutes les lignes passent les 3 contrôles | **Validation automatique** — commande envoyée directement à la file de l'Agent d'Hospitalité |
| Une ligne dépasse un quota, mais la configuration société autorise un dépassement avec validation manager | **Mise en attente d'approbation** — notification envoyée au Department Manager, commande visible en statut "En attente" pour l'employé |
| Une ligne dépasse un quota et la configuration impose un rejet strict | **Rejet automatique de la ligne concernée** — l'employé est invité à ajuster la quantité ou retirer l'article |
| Une ligne référence un produit en rupture de stock au moment de la confirmation | **Rejet automatique de la ligne** — message "Produit devenu indisponible", suggestion de produit similaire si disponible |

Ce moteur tourne également de façon préventive pendant la composition du panier (Écran 2) : c'est lui qui pilote la désactivation en temps réel des boutons "+" lorsqu'un quota ou un stock devient insuffisant, évitant ainsi à l'employé de découvrir le blocage seulement à la confirmation.

### Écran 4 — Suivi de commande (temps réel)
- Stepper horizontal/vertical : Créée → Validée → En préparation → En livraison → Livrée
- Estimation du temps restant (en lien avec le SLA de sa priorité)
- Carte avec contact de l'agent d'hospitalité assigné (optionnel)
- Bouton "Annuler" (actif uniquement avant le statut "En préparation")

### Écran 5 — Historique des commandes
- Liste chronologique avec filtre par période
- Chaque ligne : date, articles, statut final
- Action "Recommander" (raccourci pour reproduire une commande passée)

### Écran 6 — Réservation salle de réunion
- Calendrier/sélecteur de créneau
- Sélection de la salle (avec capacité affichée)
- Sélection des services hospitalité associés (mêmes cartes produits que le catalogue, en mode "service collectif")
- Récapitulatif et confirmation

### Écran 7 — Notifications
- Liste chronologique avec icônes par type (commande, quota, alerte)
- Marquage lu/non lu

### Écran 8 — Profil
- Informations personnelles (lecture seule majoritairement)
- Préférence de langue
- Historique de quota mensuel sous forme de graphique simple

## 1.4 Principes UI spécifiques
- Interface mobile-first, navigation par bottom tab bar (Accueil / Catalogue / Commandes / Notifications / Profil)
- Support RTL complet : inversion de la mise en page, icônes directionnelles, dates en numérotation arabe ou occidentale selon préférence
- Codes couleur cohérents pour les statuts (ex. orange = en attente, bleu = en préparation, vert = livré, rouge = bloqué/quota dépassé)
- Feedback immédiat (toast/snackbar) après chaque action

---

# PARTIE 2 — PROFIL AGENT D'HOSPITALITÉ

## 2.1 Rôle fonctionnel

L'Agent d'Hospitalité (Hospitality Service Staff) est l'utilisateur opérationnel qui réceptionne, prépare et/ou livre les commandes des employés, exécute les services en salle de réunion, et fait remonter les ruptures de stock. Il travaille sur une vue "file d'attente" priorisée et doit respecter des SLA stricts. Probablement utilisé en mobilité (tablette ou mobile) sur le terrain.

## 2.2 Fonctionnalités

- Authentification dédiée (rôle staff)
- Visualisation de la file d'attente des commandes à traiter (priorisée automatiquement)
- Changement de statut d'une commande (Acceptée → En préparation → En livraison/Service → Terminée)
- Vue détaillée d'une commande (articles, quantités, employé/salle destinataire, niveau de priorité, SLA restant)
- Gestion des services en salle de réunion : checklist d'installation et de clôture
- Déclaration rapide d'un incident (rupture de stock, produit indisponible) directement depuis une commande
- Consultation rapide du stock de sa branche (lecture)
- Suivi et réapprovisionnement des **emplacements VIP en libre-service** (frigos de bureau) : alerte de seuil bas, tâche de réapprovisionnement, confirmation de réapprovisionnement
- Notifications temps réel des nouvelles commandes et alertes SLA
- Vue "Mode Cuisine" (file de préparation) vs "Mode Livraison/Service" (tournée) selon le rôle exact
- Historique de ses interventions (productivité)

## 2.3 Écrans UI

### Écran 1 — File d'attente / Tableau de bord opérationnel
- Liste type Kanban ou liste triée automatiquement par : Priorité (P1→P5) > Horaire réunion > Heure de commande
- Chaque carte commande affiche : badge de priorité coloré (rouge=VIP/P1, etc.), nom employé ou salle, articles résumés, minuteur SLA (compte à rebours visuel, qui change de couleur — vert/orange/rouge — à l'approche de la limite)
- Filtres rapides : Toutes / VIP / En retard / Réunions
- Compteur en haut : "X commandes en attente, Y en retard"

### Écran 2 — Détail d'une commande
- Liste des articles avec quantités
- Informations destinataire : employé (photo, badge priorité) ou salle de réunion (localisation, capacité, étage)
- Chronomètre SLA proéminent
- Boutons d'action contextuels selon statut : "Accepter" → "Marquer en préparation" → "Marquer prête" → "Marquer livrée/servie"
- Bouton secondaire "Signaler un problème" (rupture de stock, produit manquant) ouvrant une mini-fiche incident

### Écran 3 — Mode Service Salle de Réunion
- Checklist interactive (cases à cocher) : Produits livrés / Salle préparée / Nettoyage effectué
- Impossible de clôturer le service tant que la checklist n'est pas complète (bouton "Terminer" désactivé/grisé jusque-là)
- Photo optionnelle de preuve d'installation

### Écran 4 — Consultation stock rapide (lecture)
- Recherche produit
- Affichage quantité disponible dans la branche + statut (Normal / Stock bas / Rupture)
- Bouton "Signaler une rupture" qui notifie l'Inventory Manager

### Écran 4-bis — Réapprovisionnement VIP (libre-service)
- Liste des emplacements VIP sous son périmètre (ex. "Frigo — Bureau Directeur Général", "Frigo — Bureau CFO") avec statut visuel (Normal / Seuil bas / Vide)
- Chaque ligne affiche le ou les produits sous seuil et la quantité à apporter
- Action "Marquer comme réapprovisionné" → horodatage + remise à jour automatique du stock de l'emplacement
- Pas de notion de commande, de priorité ou de SLA ici : c'est une tâche de maintenance de stock, pas une commande employé
- Si le stock central de la branche est lui-même insuffisant pour réapprovisionner l'emplacement, une alerte est transmise à l'Inventory Manager / Procurement plutôt qu'à l'Agent

### 2.2-bis — Logique du Libre-Service VIP

Les produits destinés aux VIP/Exécutifs ne suivent **pas** le circuit commande → priorité → SLA → livraison. Ils sont stockés physiquement à l'avance dans un emplacement dédié (frigo, placard de bureau) que le VIP utilise en autonomie totale, sans passer par l'application.

Le système traite donc ces produits uniquement sous l'angle **stock & achat** :

```text
Stock emplacement VIP consommé progressivement (hors app, pas de traçabilité commande)
        │
        ▼
Seuil minimum atteint → Alerte automatique
        │
        ▼
Tâche de réapprovisionnement assignée à l'Agent d'Hospitalité (ou Inventory Manager)
        │
        ▼
Réapprovisionnement physique effectué → confirmation dans l'app
        │
        ▼
Si stock central insuffisant → déclenchement d'un besoin d'achat (Module Procurement)
```

Ces produits ne génèrent donc jamais d'entrée dans la file d'attente cuisine/livraison de l'Agent, ni de quota employé, ni de notification de suivi de commande côté Employé.

### Écran 5 — Notifications & Alertes
- Flux temps réel : nouvelle commande VIP, alerte SLA imminent, alerte stock
- Alertes critiques (VIP, SLA dépassé) affichées avec un style visuel distinct (bannière rouge en haut d'écran, son/vibration)

### Écran 6 — Historique / Performance personnelle
- Nombre de commandes traitées (jour/semaine)
- Taux de respect des SLA
- Liste des interventions passées

## 2.4 Principes UI spécifiques
- Interface optimisée pour usage rapide en mobilité : gros boutons d'action, peu de saisie texte, actions en un tap
- Priorité visuelle forte sur les éléments urgents (VIP, SLA en danger) — code couleur et position en tête de liste
- Mode tablette possible pour la cuisine (écran fixe affiché en continu, type "kitchen display system")
- Confirmation sonore/visuelle à chaque changement de statut pour éviter les erreurs de manipulation
- Accès simplifié et rapide entre les modes (file d'attente / salle de réunion / stock) via une navigation par onglets fixes

---

## 3. Interaction entre les deux profils

```text
Employé crée une commande
        │
        ▼
Système applique priorité + SLA + vérifie quota
        │
        ▼
Commande apparaît dans la file de l'Agent d'Hospitalité
        │
        ▼
Agent accepte → prépare → livre/sert
        │
        ▼
Statut mis à jour en temps réel → Notification envoyée à l'Employé
        │
        ▼
Commande clôturée → alimente les rapports (consommation, SLA, performance)
```

Les deux interfaces partagent donc le même back-end de commande mais affichent des informations et actions radicalement différentes : l'Employé voit une expérience de consommation simple (catalogue, panier, suivi), tandis que l'Agent d'Hospitalité voit une interface opérationnelle orientée file d'attente, priorité et SLA.
