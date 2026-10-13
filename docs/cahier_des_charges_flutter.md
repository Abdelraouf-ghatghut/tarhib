# Cahier des charges — Application mobile Flutter (Employé & Agent d'Hospitalité)

## 1. Contexte et objectif

Une seule application mobile Flutter dessert deux rôles métier : **Employé** (demandeur de prestations) et **Agent d'Hospitalité** (préparateur/livreur). L'application détecte le rôle de l'utilisateur après authentification et adapte dynamiquement la navigation, les écrans et les actions disponibles, sans dupliquer le code.

**Principe directeur** : une seule base de code, un seul binaire distribué (un seul package sur les stores), un routing et des widgets conditionnés par le rôle stocké en session.

## 2. Périmètre fonctionnel

### 2.1 Fonctionnalités communes aux deux rôles
- Authentification (email/téléphone + mot de passe)
- Gestion de session (JWT + refresh automatique)
- Profil utilisateur (consultation, déconnexion)
- Notifications (liste, badge, marquage lu/non lu, push)
- Mode hors-ligne partiel (lecture du cache, file d'attente d'actions)

### 2.2 Fonctionnalités spécifiques — rôle Employé
- Tableau de bord : quota restant, commandes en cours, commandes livrées, historique
- Consultation du catalogue (filtré automatiquement par rôle/site/disponibilité côté API)
- Création de commande (produit, quantité, lieu, salle, heure souhaitée, commentaire)
- Suivi du statut d'une commande en temps réel
- Confirmation de réception (optionnelle)
- Historique des commandes avec filtres (date, statut)

### 2.3 Fonctionnalités spécifiques — rôle Agent d'Hospitalité
- Tableau de bord : commandes à préparer, commandes prioritaires, livraisons en cours, statistiques du jour
- File d'attente des commandes triée par priorité (Direction > Manager > Employé > Visiteur)
- Détail d'une commande (produits, quantités, lieu, salle, heure, commentaire)
- Actions : accepter, démarrer préparation, signaler un problème, demander un remplacement
- Passage en livraison : confirmer départ, confirmer remise
- Vue "mes livraisons du jour"

### 2.4 Hors périmètre de cette application
- Interfaces Responsable et Administrateur (couvertes par l'application Web d'Administration)
- Gestion des stocks/fournisseurs (back-office uniquement)
- Reporting avancé (back-office uniquement)

## 3. Architecture applicative

### 3.1 Stack technique
| Composant | Choix |
|---|---|
| Framework | Flutter (dernière version stable) |
| Langage | Dart (null-safety) |
| Gestion d'état | Riverpod (recommandé) ou Bloc — à figer avant le développement |
| Routing | `go_router` avec redirection conditionnelle |
| Appels API | `dio` (intercepteurs pour JWT/refresh) |
| Stockage local sécurisé | `flutter_secure_storage` (tokens), `hive` ou `drift` (cache catalogue/commandes) |
| Notifications push | Firebase Cloud Messaging |
| Temps réel | WebSocket (`socket_io_client` ou équivalent) pour statuts de commande |
| Internationalisation | `flutter_localizations` + `intl` (FR par défaut, extensible) |
| Injection de dépendances | Riverpod providers (ou `get_it` si Bloc) |

### 3.2 Structure de dossiers proposée

```
lib/
 ├── core/
 │   ├── network/         (client dio, intercepteurs, gestion erreurs)
 │   ├── storage/         (secure storage, cache local)
 │   ├── auth/            (gestion JWT, refresh token, session)
 │   └── theme/           (design system partagé)
 ├── routing/
 │   ├── app_router.dart  (go_router + redirection par rôle)
 │   └── role_guard.dart  (logique d'autorisation par route)
 ├── features/
 │   ├── auth/            (login, écrans communs)
 │   ├── notifications/   (commun)
 │   ├── profil/          (commun)
 │   ├── employe/
 │   │   ├── dashboard/
 │   │   ├── catalogue/
 │   │   ├── commande/
 │   │   └── historique/
 │   └── agent/
 │       ├── dashboard/
 │       ├── file_attente/
 │       ├── commande_detail/
 │       └── livraison/
 ├── shared/
 │   ├── widgets/         (composants UI réutilisables)
 │   └── models/          (modèles de données partagés : Commande, Produit, Utilisateur...)
 └── main.dart
```

**Règle de conception** : tout ce qui est dans `features/employe/` et `features/agent/` ne doit dépendre que de `core/` et `shared/`, jamais l'un de l'autre — cela évite le couplage entre les deux parcours métier.

## 4. Routing conditionnel par rôle

### 4.1 Mécanisme
- À la connexion, l'API retourne le rôle de l'utilisateur (`EMPLOYE` ou `AGENT`, autres rôles rejetés côté app avec message explicite).
- Le rôle est stocké dans le `AuthProvider`/`AuthState` (en mémoire, et persisté chiffré pour le rappel de session).
- `go_router` utilise une fonction `redirect` globale qui :
  1. vérifie si l'utilisateur est authentifié → sinon redirige vers `/login`
  2. vérifie si la route demandée appartient à l'espace du rôle courant → sinon redirige vers le dashboard du rôle
  3. laisse passer si conforme

### 4.2 Table de routes indicative

| Route | Rôle autorisé | Écran |
|---|---|---|
| `/login` | Public | Connexion |
| `/home` | Employé + Agent | Redirection automatique vers `/home/employe` ou `/home/agent` |
| `/home/employe` | Employé | Dashboard Employé |
| `/home/employe/catalogue` | Employé | Catalogue |
| `/home/employe/commande/nouvelle` | Employé | Création de commande |
| `/home/employe/commande/:id` | Employé | Détail/suivi commande |
| `/home/employe/historique` | Employé | Historique |
| `/home/agent` | Agent | Dashboard Agent |
| `/home/agent/file-attente` | Agent | File d'attente des commandes |
| `/home/agent/commande/:id` | Agent | Détail commande à préparer/livrer |
| `/home/agent/livraisons` | Agent | Livraisons du jour |
| `/profil` | Employé + Agent | Profil (contenu adapté au rôle) |
| `/notifications` | Employé + Agent | Liste des notifications |

### 4.3 Bottom navigation conditionnelle
La barre de navigation inférieure (3-4 items) est générée dynamiquement à partir d'une configuration par rôle, par exemple :
- **Employé** : Accueil / Catalogue / Historique / Profil
- **Agent** : Accueil / File d'attente / Livraisons / Profil

Un seul widget `AppShell` lit le rôle courant et injecte la bonne liste d'items et le bon `IndexedStack`/`StatefulNavigationShell` (go_router branch navigation).

## 5. Gestion d'état

- **AuthState** (global) : utilisateur connecté, rôle, permissions, tokens, statut de session
- **NotificationState** (global) : liste des notifications, compteur non lus, écoute WebSocket/push
- **États locaux par feature** : ex. `CatalogueState` (Employé), `FileAttenteState` (Agent), gérés indépendamment pour éviter qu'une mise à jour de l'un déclenche un rebuild inutile chez l'autre rôle
- Utilisation de providers "scopés" par feature pour permettre le tree-shaking et limiter le code chargé en mémoire selon le rôle actif

## 6. Modèles de données (côté app)

Modèles Dart à créer dans `shared/models/`, en miroir des entités API :

- `Utilisateur` (id, nom, prénom, rôle, site, entreprise, permissions)
- `Produit` (id, nom, description, prix, unité, catégorie, image, disponible)
- `Commande` (id, statut, priorité, lignes, lieu, salle, heureSouhaitee, commentaire, dates de cycle de vie, agentAssigné)
- `LigneCommande` (produit, quantité)
- `Quota` (valeurMax, valeurConsommée, période)
- `Notification` (type, titre, message, lue, commandeId, date)

Chaque modèle expose `fromJson`/`toJson` (via `freezed` + `json_serializable` recommandé pour l'immutabilité et la cohérence avec le backend NestJS).

## 7. Intégration API

### 7.1 Authentification
- `POST /auth/login` → JWT + refresh token
- `POST /auth/refresh` → nouveau JWT
- Intercepteur dio : ajoute le JWT sur chaque requête, déclenche le refresh automatique sur 401, déconnecte si le refresh échoue

### 7.2 Endpoints consommés (Employé)
- `GET /catalogue` (filtré côté serveur par rôle/site)
- `POST /commandes` (création)
- `GET /commandes/mes-commandes`
- `GET /commandes/:id`
- `GET /quotas/moi`

### 7.3 Endpoints consommés (Agent)
- `GET /commandes/a-preparer?siteId=...`
- `PATCH /commandes/:id/statut` (préparation, livraison, problème, remplacement)
- `GET /commandes/agent/mes-livraisons`

### 7.4 Temps réel
- WebSocket pour : nouvelle commande dans la file (Agent), changement de statut (Employé), notification push de secours si l'app est en arrière-plan

## 8. Notifications

- **Push (FCM)** : nouvelle commande à préparer (Agent), commande validée/refusée/livrée (Employé), quota dépassé, rupture de stock affectant un produit commandé
- **In-app** : centre de notifications commun, badge sur l'icône de l'app, deep-link vers la commande concernée

## 9. Mode hors-ligne / résilience

- Cache local du catalogue et des commandes en cours (lecture seule en cas de perte réseau)
- File d'attente locale pour les actions critiques de l'Agent (changement de statut) avec retry automatique à la reconnexion
- Indicateur visuel de statut réseau (bannière "hors-ligne")

## 10. Permissions device

- **Notifications push** : demande explicite au premier lancement avec explication
- **Caméra** (optionnel, si scan de code-barres pour réception/contrôle produit envisagé) : à confirmer selon besoin
- Aucune géolocalisation prévue dans le périmètre actuel — à valider si la livraison doit être tracée par position

## 11. Design system

- Thème clair unique au lancement (mode sombre en option ultérieure)
- Composants partagés : carte de commande, badge de statut (coloré par statut), barre de quota, liste de notifications
- Iconographie et palette différenciées légèrement par rôle (ex. couleur d'accent) pour aider l'utilisateur à se repérer visuellement sans dupliquer les écrans
- **Police compatible arabe obligatoire** dès le départ (ex. `Cairo`, `Tajawal` ou `IBM Plex Sans Arabic`) — ne pas démarrer le design avec une police qui ne couvre pas les glyphes arabes, car la migrer après coup casse les mises en page
- Tous les espacements et alignements doivent utiliser les variantes *directionnelles* de Flutter (`EdgeInsetsDirectional`, `Alignment.startEnd` / `TextDirection`) plutôt que `left`/`right` en dur, pour que le miroir RTL se fasse automatiquement
- Les icônes directionnelles (flèches "suivant/précédent", chevrons de navigation) doivent être mises en miroir automatiquement en RTL ; les icônes neutres (panier, notification, profil) ne le sont pas

## 12. Internationalisation et localisation

**Marché de lancement : Libye — langue principale arabe (RTL), langue secondaire anglais.**

- **Arabe (ar)** = langue par défaut au premier lancement, avec direction RTL appliquée globalement (`Directionality` au niveau de `MaterialApp`, déterminée par la locale active)
- **Anglais (en)** = langue secondaire sélectionnable par l'utilisateur (LTR) — l'app doit donc gérer le changement de direction de texte dynamiquement, pas seulement le changement de mots
- Sélecteur de langue accessible depuis l'écran Profil, choix persisté localement (`shared_preferences` ou équivalent — pas besoin de toucher au token de session), appliqué immédiatement sans redémarrage de l'app
- Architecture multilingue via `intl` / fichiers `.arb` (`app_ar.arb`, `app_en.arb`) — aucune chaîne en dur dans les widgets, dès le premier écran développé
- **Contenu venant du backend** (catalogue, notifications) : l'API renvoie systématiquement les deux versions (`nom_ar`/`nom_en`, etc.) ou un code structuré (statuts, codes de refus) — c'est l'app qui choisit le champ à afficher selon la langue active, jamais le backend qui décide
- **Chiffres** : décider explicitement si l'app affiche les chiffres en numérotation occidentale (0,1,2...) ou en chiffres arabes orientaux (٠١٢٣...) en mode arabe — l'usage courant en Libye dans les interfaces numériques est largement la numérotation occidentale, à confirmer avant le développement de l'écran de commande et des montants
- **Formats locaux à utiliser via `intl`** plutôt qu'en dur, et à adapter selon la langue active :
  - Devise : Dinar libyen (LYD, symbole د.ل en arabe / LYD en anglais), via `NumberFormat.currency`
  - Dates et heures : calendrier grégorien par défaut, format localisé selon la langue active
  - Numéros de téléphone : format libyen `+218` suivi de 9 chiffres (préfixes mobiles courants 91/92/93/94)
- **Tests RTL/LTR spécifiques** à ajouter en section 14 : vérifier qu'aucun écran ne casse visuellement ni en arabe (RTL) ni en anglais (LTR)
- Le contenu administrateur (catalogue) doit être saisi dans les deux langues dès la mise en place (jour 2 du sprint backend) — un produit sans `nom_en` ne doit pas pouvoir être publié si l'anglais est activé pour le lancement

## 13. Sécurité côté app

- Tokens stockés via `flutter_secure_storage` (Keychain/Keystore), jamais en `SharedPreferences`
- Déconnexion automatique si le refresh token est invalide/expiré
- Pas de données sensibles en cache non chiffré
- Vérification du rôle non seulement côté UI (routing) mais confirmée systématiquement côté API (l'app ne doit jamais être la seule barrière de sécurité)

## 14. Tests

- **Tests unitaires** : logique de redirection par rôle, calcul de quota restant côté UI, parsing des modèles
- **Tests widgets** : dashboard Employé, dashboard Agent, formulaire de création de commande, file d'attente
- **Tests d'intégration** : parcours complet "connexion → création commande → suivi statut" et "connexion → file d'attente → préparation → livraison"
- **Tests de non-régression de routing** : un utilisateur Employé ne doit jamais pouvoir accéder à une route Agent (et inversement) même en forçant l'URL/deep-link
- **Tests RTL** : capture d'écran ou golden test sur chaque écran principal en locale `ar` pour détecter tout débordement de texte ou mauvais alignement

## 15. Livrables attendus

1. Code source Flutter structuré selon l'arborescence proposée (section 3.2)
2. Documentation des routes et de la logique de redirection par rôle
3. Jeu de composants UI partagés documentés (Storybook Flutter ou simple catalogue d'écrans de démo)
4. Suite de tests automatisés (unitaires + widgets + au moins 2 parcours d'intégration)
5. Build signé Android (APK/AAB) et iOS (IPA) pour recette

## 16. Critères d'acceptation

- Un même compte ne peut jamais voir les écrans de l'autre rôle, y compris via navigation directe par URL/deep-link
- Le changement de statut d'une commande par l'Agent est visible côté Employé en moins de 5 secondes (push ou WebSocket)
- L'application reste utilisable en lecture (catalogue, commandes en cours) en cas de coupure réseau de courte durée
- Le temps de démarrage à froid (cold start) jusqu'au dashboard est inférieur à 3 secondes sur un appareil de milieu de gamme

## 17. Points à valider avec vous avant développement

- Confirmation du choix de state management (Riverpod recommandé, mais à valider selon les compétences de l'équipe)
- Besoin ou non de géolocalisation pour la livraison
- Besoin ou non de scan code-barres/QR pour la réception de commande côté Agent
- Politique de gestion du mode hors-ligne : lecture seule suffisante, ou écriture différée complète nécessaire ?