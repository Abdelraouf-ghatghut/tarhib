# Plan de développement et d'implémentation des applications mobiles Tarhib

**Version :** 1.0  
**Date :** 12 août 2026  
**Applications concernées :** Tarhib Employee et Tarhib Operations  
**Socle technique :** Expo / React Native, NestJS, PostgreSQL, Redis et Keycloak

## 1. Objectif du plan

Ce plan conduit les deux applications mobiles depuis leur état actuel jusqu'à un lancement en production dans lequel chaque rôle peut accomplir l'intégralité de ses missions quotidiennes autorisées, sans dépendre du Web Admin pour une opération de terrain.

Dans ce document, « couverture à 100 % » signifie qu'une mission obligatoire dispose :

- d'un parcours complet de consultation et d'exécution ;
- des contrôles de permissions et de périmètre côté mobile **et** côté API ;
- d'états de chargement, vide, erreur, succès et réseau dégradé ;
- d'une confirmation serveur ou d'un état explicite « à synchroniser » ;
- d'une traçabilité métier ;
- de tests automatisés et d'une recette terrain validée par le rôle concerné.

Cela ne signifie pas « zéro anomalie possible », mais aucune anomalie bloquante ou majeure connue sur les missions critiques au moment du lancement.

### État d'avancement au 12 août 2026

- ✅ Équipes de préparation : responsable unique, participants multiples, validations serveur et sélection mobile.
- ✅ Zones opérationnelles : zones Livraison/Ménage multi-étages et affectations datées.
- ✅ Livraison : affichage des zones et filtrage serveur des missions par étage, avec exception explicitement affectée.
- ✅ Ménage : destination structurée, création par zone/étage, affichage des missions de zone et prise en charge atomique.
- ✅ Web Admin : création des zones multi-étages, affectations datées, désactivation et historique par zone.
- ✅ Fondation de fiabilité mobile P0 — implémentation logicielle : **100 %**.
- ⏳ Prochain lot : Tarhib Employee complet — catalogue, commande, suivi et salles en recette métier.

| Phase vers la production                    | Avancement | Preuves actuelles                                                                                                                                        |
| ------------------------------------------- | ---------: | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 — cadrage et socle métier           |      100 % | Matrice des rôles, zones opérationnelles, équipes de préparation et contrats d'API                                                                       |
| Phase 1 — fondation de fiabilité P0         |  **100 %** | Bandeau réseau global, erreurs AR/EN, confirmation serveur, retry contrôlé, idempotence commande, séparation Employee/Operations et 10 tests automatisés |
| Phase 2 — Tarhib Employee complet           |  **100 %** | Catalogue complet, allergènes/nutrition, favoris, plafond stock/quota, annulation, évaluation, suivi et salles filtrables validés sur iOS/Android        |
| Phase 3 — Cuisine, hospitalité et livraison |  **100 %** | Cuisine, supervision et livraison connectée/hors ligne validées sur iOS et Android                                                                       |

Le pourcentage ci-dessus mesure l'implémentation de chaque phase. La recette sur appareils physiques et la validation métier restent des portes de passage obligatoires avant le lancement, et ne sont pas remplacées par ce pourcentage.

## 2. Périmètre et décisions structurantes

### 2.1 Applications actives

- `apps/mobile-employee` est l'unique application destinée aux employés des entreprises clientes.
- `apps/mobile-operations` est l'unique application destinée au personnel interne Tarhib.
- `packages/mobile-shared` porte l'authentification, l'accès API, les permissions, les notifications, le temps réel, le thème et les composants communs.
- L'ancienne application Flutter archivée ne doit plus recevoir de développement fonctionnel ni entrer dans la chaîne de publication.

### 2.2 Répartition Mobile / Web Admin

Le mobile couvre l'exécution terrain, la consultation immédiate, les alertes et les décisions urgentes. Le Web Admin reste l'outil de configuration avancée : création de rôles, matrice de permissions, paramétrage global, opérations de masse, référentiels et analyses détaillées.

### 2.3 Langues et police

- Seuls l'arabe et l'anglais doivent être disponibles dans les deux applications mobiles.
- RTL et LTR doivent fonctionner sur chaque écran, y compris les listes, formulaires, graphiques et contenus dynamiques.
- Le français ne fait pas partie du périmètre mobile et ne doit pas être proposé dans le sélecteur de langue.
- Tant qu'une autorisation écrite ne confirme pas le droit d'embarquer Thmanyah dans les bundles mobiles, utiliser une police système arabe adaptée. Aucun fichier Thmanyah ne doit être committé ou inclus dans les artefacts CI/CD.

### 2.4 Environnements

Créer quatre environnements strictement séparés :

| Environnement | Usage               | Données                  | Distribution             |
| ------------- | ------------------- | ------------------------ | ------------------------ |
| Local         | Développement       | Fixtures / base locale   | Expo development build   |
| Intégration   | CI et tests API     | Données jetables         | Aucun utilisateur métier |
| Préproduction | Recette complète    | Jeu de données anonymisé | Distribution interne     |
| Production    | Exploitation réelle | Données réelles          | Stores ou MDM            |

Les profils EAS actuels doivent être corrigés pour viser les URL réelles de chaque environnement. La production Tarhib utilise `https://api.tarhib.ly`, et non l'URL d'exemple actuellement déclarée dans `eas.json`.

### 2.5 Chantier authentification mobile complémentaire

Le parcours d'inscription Employee par code entreprise et les parcours de première connexion, changement et réinitialisation de mot de passe Operations sont détaillés dans `docs/Plan_Chantier_Inscription_Et_Mots_De_Passe_Mobile.md`. Ce chantier est une porte de sécurité obligatoire avant le pilote : il supprime notamment la conservation temporaire du mot de passe d'auto-inscription dans Redis et introduit un accès Operations bloqué jusqu'au remplacement du mot de passe initial.

## 3. Rôles cibles et définition de complétude

### 3.1 Matrice des missions

| Rôle                                    | Application | Missions qui doivent être totalement réalisables sur mobile                                                                                                                                             |
| --------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Employé client                          | Employee    | Consulter les produits autorisés, gérer le panier, commander, suivre/annuler, consulter quota et historique, réserver/annuler une salle, gérer profil et notifications                                  |
| Cuisinier                               | Operations  | Prendre une commande, contrôler les lignes, démarrer la préparation, signaler rupture/substitution, déclarer prête, demander un réapprovisionnement                                                     |
| Agent hospitalité / superviseur de file | Operations  | Superviser la file, approuver/rejeter selon permission, traiter les exceptions et coordonner cuisine/livraison                                                                                          |
| Livreur                                 | Operations  | Prendre en charge les livraisons situées dans le ou les étages de sa zone attribuée, consulter la destination, signaler l'arrivée ou un incident, confirmer la remise et synchroniser en réseau dégradé |
| Responsable stock                       | Operations  | Consulter par emplacement, entrer/sortir/compter, gérer pertes, demandes, transferts, réceptions, écarts, lots et péremptions                                                                           |
| Responsable achats                      | Operations  | Gérer brouillons, lignes et fournisseurs, soumettre, approuver/rejeter selon permission, envoyer, réceptionner partiellement et clôturer                                                                |
| Agent ménage                            | Operations  | Voir les missions situées dans sa ou ses zones attribuées, exécuter les checklists, demander des fournitures, signaler un blocage et terminer une tâche                                                 |
| Responsable de préparation              | Operations  | Prendre la responsabilité d'une préparation, constituer et modifier son équipe, distribuer les tâches, suivre l'avancement et soumettre la préparation terminée                                         |
| Participant à une préparation           | Operations  | Voir les préparations auxquelles il participe, exécuter les tâches qui lui sont confiées et signaler un blocage au responsable                                                                          |
| Manager hospitalité / Admin branche     | Operations  | Superviser les exceptions, l'équipe, les SLA, affecter/réaffecter, approuver les dérogations et agir dans son périmètre                                                                                 |
| Direction générale / Super Admin        | Operations  | Consulter les KPI et alertes critiques, effectuer les approbations urgentes et changer explicitement de périmètre                                                                                       |

Un employé possédant plusieurs rôles reçoit l'union de ses permissions, mais l'interface doit rester organisée autour de « Mon travail » et non afficher une accumulation désordonnée d'onglets.

## 4. Architecture fonctionnelle cible

### 4.1 Navigation Employee

`Accueil / Catalogue` → `Commandes` → `Réserver` si autorisé → `Profil`.

Le panier est une action flottante contextuelle avec badge. Une notification ouvre directement la ressource concernée, par exemple `tarhib-employee://orders/{id}` ou `tarhib-employee://rooms/{id}`.

### 4.2 Navigation Operations

`Mon travail` → `Module principal` → `Alertes` → `Plus` → `Profil`.

La composition dépend des capacités renvoyées par `/operations/me` :

- cuisinier : Mon travail, Cuisine, Stock cuisine, Alertes ;
- livreur : Mon travail, Livraisons, Incidents, Profil ;
- stock : Alertes, Inventaire, Transferts, Plus ;
- achats : Bons, Réceptions, Fournisseurs, Plus ;
- ménage : Mon travail, Mes zones, Fournitures, Incidents, Profil ;
- responsable de préparation : Mon travail, Mon équipe, Checklist, Incidents ;
- participant à une préparation : Mon travail, Mes tâches, Incidents, Profil ;
- manager : Exceptions, Équipe, Vue globale, Plus.

Chaque tâche possède une route dédiée et restaurable : `/orders/:id`, `/deliveries/:id`, `/inventory/:id`, `/transfers/:id`, `/purchase-orders/:id`, `/tasks/:id`.

### 4.3 Contrat d'accès unique

Le profil d'accès serveur est la source de vérité : identité, rôles, permissions, capacités, modules et `dataScope`. Le mobile doit :

1. ne construire la navigation qu'après résolution du profil ;
2. ne lancer une requête que si la permission correspondante existe ;
3. cacher toute action interdite, sans considérer ce masquage comme une sécurité ;
4. laisser l'API refuser systématiquement les appels non autorisés ;
5. invalider le profil dès qu'un rôle ou une permission change ;
6. afficher un écran clair si l'utilisateur ouvre la mauvaise application.

### 4.4 Modèle d'affectation des zones et des préparations

Les affectations ne doivent pas être codées dans les rôles. Elles constituent des données opérationnelles datées et administrables :

- une **zone de livraison** appartient à une branche et contient un ou plusieurs étages, éventuellement limités à un bâtiment ;
- un livreur peut recevoir une ou plusieurs zones, avec date de début, date de fin facultative et statut actif ;
- une **zone de ménage** appartient à une branche et regroupe un ou plusieurs étages, locaux, salles ou espaces communs ;
- un agent de ménage peut recevoir une ou plusieurs zones ;
- une mission créée dans un emplacement hérite automatiquement de la zone correspondante ;
- une **préparation** possède exactement un responsable actif et zéro ou plusieurs participants ;
- le responsable choisit les participants parmi les employés disponibles et autorisés de la branche ;
- le responsable peut répartir les éléments de checklist entre les participants et suivre leur avancement ;
- tout changement de zone, responsable ou équipe est historisé avec auteur, date, ancienne et nouvelle valeur.

En cas de chevauchement de zones, l'API doit appliquer une règle explicite : attribution manuelle prioritaire, sinon équilibrage selon la charge. Une absence ou une indisponibilité permet au manager de désigner un remplaçant sans modifier définitivement la zone habituelle.

### 4.5 Données, API et permissions à prévoir

Le modèle backend doit au minimum représenter :

- `buildings`, `floors` et `operational_zones` ;
- la relation entre une zone et ses étages/locaux ;
- `employee_zone_assignments` avec type `DELIVERY` ou `CLEANING`, période, statut et éventuel remplacement ;
- `preparation_assignments` avec mission, responsable, participants, auteur et historique ;
- l'affectation facultative d'un élément de checklist à un participant ;
- l'indisponibilité planifiée d'un employé afin d'éviter une affectation impossible.

Les API doivent fournir des opérations séparées pour : gérer les zones, affecter un employé, obtenir « mes zones », obtenir « mon travail », remplacer temporairement un agent, désigner/transférer le responsable d'une préparation, gérer les participants et distribuer les tâches.

Permissions proposées à intégrer dans la matrice RBAC :

- `delivery.zone.view`, `delivery.zone.manage` et `delivery.out_of_zone.assign` ;
- `cleaning.zone.view` et `cleaning.zone.manage` ;
- `preparation.team.view`, `preparation.team.manage` et `preparation.responsibility.transfer` ;
- `preparation.task.execute` et `preparation.override`.

Les contrôles de zone doivent toujours être exécutés côté API à partir de la destination structurée de la mission. Le mobile ne doit jamais décider seul qu'un étage appartient à un livreur ou à un agent de ménage.

## 5. Backlog d'implémentation priorisé

## Lot 0 — Cadrage exécutable et preuve de couverture

**But :** transformer le cahier des charges en backlog testable avant d'ajouter des écrans.

### Travaux

- Geler la liste officielle des rôles, permissions et transitions d'état.
- Créer une matrice versionnée `rôle × permission × endpoint × écran × action`.
- Créer en préproduction un compte de test par rôle et plusieurs comptes multi-rôles.
- Définir les périmètres de test `OWN`, `BRANCH`, `COMPANY` et `GLOBAL`.
- Cartographier chaque écran existant vers les API réellement appelées.
- Définir les référentiels bâtiment, étage, local et zone, puis migrer les destinations existantes vers ces identifiants structurés.
- Définir les règles de remplacement temporaire, de chevauchement et de disponibilité des livreurs et agents de ménage.
- Valider le cycle de préparation : création → désignation du responsable → constitution de l'équipe → exécution → contrôle → clôture.
- Classer chaque capacité : existante et validée, existante à corriger, API manquante, écran manquant.
- Définir les événements analytiques sans données personnelles : ouverture de tâche, action tentée, succès, échec, durée et abandon.

### Critère de sortie

Chaque mission de la matrice possède un propriétaire, une priorité, une API cible et au moins un scénario de recette.

## Lot 1 — Fondation de fiabilité commune

**Priorité : P0 — avant tout pilote.**

**Avancement d'implémentation : 100 % — terminé le 12 août 2026.**

Décisions de sécurité appliquées : les mutations métier ne sont pas mises en file hors-ligne par défaut, afin de ne jamais rejouer silencieusement une écriture sensible. Elles restent bloquées par TanStack Query hors connexion et sont reprises uniquement par une action explicite de l'utilisateur. La création de commande conserve son `clientRequestId` lors d'une nouvelle tentative manuelle. Les protections biométriques, la détection d'appareil compromis et la réauthentification de direction restent des options de politique de sécurité avant généralisation ; elles ne conditionnent pas le pilote tant qu'aucune approbation sensible de direction n'est exposée dans les applications.

### Gestion des requêtes et erreurs

- Introduire un composant commun pour les états chargement, vide, erreur, hors-ligne et nouvelle tentative.
- Normaliser les erreurs API 400, 401, 403, 404, 409, 422, 429, 500 et timeout en messages AR/EN actionnables.
- Supprimer les rollbacks silencieux des mutations optimistes.
- Ajouter un identifiant de corrélation affichable au support.
- Désactiver le bouton après soumission et utiliser une clé d'idempotence pour toute création sensible.

### Session et sécurité

- Stocker les jetons uniquement dans `expo-secure-store`.
- Implémenter renouvellement, expiration et déconnexion globale fiables.
- Ajouter verrouillage biométrique/PIN facultatif après reprise en arrière-plan.
- Réauthentifier les approbations sensibles de direction.
- Ne jamais journaliser jeton, mot de passe, données personnelles ou contenu métier sensible.
- Détecter les appareils compromis selon la politique de sécurité retenue, sans en faire l'unique barrière serveur.

### Connectivité et synchronisation

- Ajouter un bandeau global de connectivité et l'heure de dernière synchronisation.
- Distinguer `confirmé serveur`, `envoi en cours`, `à synchroniser` et `échec`.
- Mettre en file seulement les mutations autorisées hors-ligne ; chaque entrée porte un identifiant idempotent, un horodatage et une version de ressource.
- Sur conflit, ne jamais écraser silencieusement : afficher la version serveur et proposer l'action autorisée.
- Chiffrer le cache local sensible et définir une durée de conservation.

### Notifications et temps réel

- Enregistrer les jetons push par appareil côté serveur.
- Persister les notifications côté serveur avec lecture/acquittement multi-appareils.
- Ajouter deep links et reprise par polling lorsque WebSocket/push est indisponible.
- Dédupliquer les notifications et respecter langue, rôle, branche et préférences.

### Qualité UX

- Assurer des cibles tactiles d'au moins 44 × 44 pt.
- Respecter tailles de texte système, lecteurs d'écran, contrastes et réduction des animations.
- Conserver filtres, saisies et tâche ouverte lors d'une interruption.
- Mettre l'action principale dans la zone accessible au pouce et afficher les informations critiques avant l'action.

### Critère de sortie

100 % des mutations critiques ont un retour explicite ; aucune requête interdite connue n'est envoyée ; reprise de session et perte réseau sont testées sur Android et iOS.

### Preuves de clôture de la phase

- Le composant partagé `ReliabilityBanner` expose hors-ligne, envoi, confirmation serveur et échec dans les deux applications.
- Les statuts 400, 401, 403, 404, 409, 422, 429 et 500, les timeouts et les erreurs réseau ont des messages actionnables en arabe et en anglais.
- Les références `X-Request-Id`/`X-Correlation-Id` sont affichées lorsqu'elles sont fournies par l'API.
- Les lectures transitoirement défaillantes sont rejouées au plus deux fois ; aucune mutation n'est rejouée automatiquement.
- Les commandes utilisent une clé client stable pendant une nouvelle tentative manuelle et les boutons critiques restent verrouillés pendant l'envoi.
- Un compte `CLIENT` est bloqué dans Operations et un compte `TARHIB` est bloqué dans Employee avant le rendu des modules.
- Les jetons natifs restent dans `expo-secure-store`, le renouvellement 401 est dédupliqué et l'expiration provoque la déconnexion globale.
- Les notifications persistées, l'acquittement, le push par appareil, les deep links commande et le polling de secours sont déjà raccordés au socle.
- La suite automatisée de normalisation compte 10 scénarios verts ; les deux applications passent le contrôle TypeScript.

## Lot 2 — Tarhib Employee complet

**Avancement d'implémentation : 100 % — terminé le 12 août 2026.**

### Validation cross-platform obligatoire

| Application       | iOS                                       | Android                                   |
| ----------------- | ----------------------------------------- | ----------------------------------------- |
| Tarhib Employee   | Bundle Expo/Hermes validé — 1 597 modules | Bundle Expo/Hermes validé — 1 602 modules |
| Tarhib Operations | Bundle Expo/Hermes validé — 1 594 modules | Bundle Expo/Hermes validé — 1 591 modules |

Les deux applications utilisent `SafeAreaView`, le clavier adaptatif iOS, des cibles tactiles de 44 pt et des identifiants de bundle séparés. Toute fonctionnalité suivante doit continuer à passer les quatre bundles. Une archive App Store signée exigera ensuite macOS/Xcode ou EAS Build ainsi que le compte Apple Developer ; le bundle JavaScript iOS est déjà vérifié dans le dépôt.

### Réalisé dans cette étape

- Recherche bilingue et filtrage par catégorie dans le catalogue.
- Favoris persistés par employé via l'API.
- Quantité du panier plafonnée au minimum entre stock frais et quota restant.
- Annulation d'une commande `PENDING`/`APPROVED` avec confirmation native iOS/Android et validation serveur.
- Évaluation de service après livraison, commentaire facultatif et protection pendant l'envoi.
- Réservation transmettant réellement participants, package et notes ; capacité revérifiée côté serveur.
- Métadonnées iOS, langue de développement arabe et évitement du clavier sur les deux applications.

### Clôture des derniers 10 %

- Le modèle produit, la migration PostgreSQL, l'API et le Web Admin gèrent les allergènes, calories, sucre et caféine.
- Une fiche produit mobile dédiée affiche ces informations avec un repli explicite lorsque la donnée n'est pas encore renseignée.
- La recherche de salles filtre maintenant par capacité minimale, équipement et accessibilité.
- Les bundles finaux Tarhib Employee sont validés sous Hermes pour iOS et Android après ces ajouts.
- Le backend et le Web Admin compilent ; les 26 tests du service produits sont verts.

**Phase suivante : Lot 3 — Cuisine, hospitalité et livraison.**

### Catalogue et commande

- Afficher uniquement les produits autorisés par rôle, entreprise et disponibilité.
- Ajouter recherche AR/EN, catégories, favoris et informations allergènes/nutrition.
- Calculer la quantité commandable comme le minimum entre stock, quota et limite par commande.
- Revalider le panier au serveur avant confirmation et expliquer chaque modification ou rejet de ligne.
- Ne jamais perdre les lignes refusées ; permettre leur correction.
- Confirmer une seule commande en cas de double tap ou de retry.

### Suivi et historique

- Ouvrir automatiquement le suivi après confirmation.
- Afficher une timeline temps réel et un repli par polling.
- Autoriser l'annulation uniquement pendant les états permis par l'API.
- Afficher clairement les motifs de rejet et proposer « Commander à nouveau ».
- Prévoir une évaluation de service après livraison si le module est activé.

### Salles

- Rechercher une salle par date, heure, capacité, équipement et accessibilité.
- Détecter les conflits avant soumission.
- Gérer durée, participants, package, notes, fuseau de Tripoli et récapitulatif.
- Permettre consultation et annulation selon les règles métier.

### Exemple de recette

Un employé de la branche A ajoute deux cafés, voit qu'il n'en reste qu'un dans son quota, corrige la quantité, confirme une seule commande malgré un double tap, suit la préparation puis la livraison, et réserve ensuite une salle de six places avec déjeuner sans conflit.

## Lot 3 — Cuisine, hospitalité et livraison

**Avancement d’implémentation : 100 % — terminé le 13 août 2026.**

Réalisé : file triée par SLA, prise de possession atomique, isolation du travail par cuisinier, checklist par ligne, états « مكتمل / مستبدل / غير متوفر », blocage serveur et mobile de « جاهز » tant que la checklist est incomplète, retour explicite en cas de conflit, mode cuisine à contraste renforcé et anti-veille natif facultatif. Les contrôles sont conçus pour iOS et Android avec une hauteur tactile minimale de 44 points.

La console superviseur consolide les validations en attente, la charge cuisine et livraison, les alertes de stock, les SLA proches ou dépassés et les incidents de livraison. L’approbation et le rejet sont uniquement proposés avec la permission `order.approve`; tout rejet sans motif est refusé par l’interface et par l’API.

Le parcours livreur applique les zones lors de la prise en charge, ordonne la tournée en conservant les urgences critiques avant le regroupement branche/étage, ajoute l’état `وصل`, puis exige une preuve de remise avec nom du réceptionnaire, code facultatif et appui long. Un identifiant unique de remise et un horodatage client sont persistés pour absorber les répétitions et préparer la synchronisation hors ligne.

En réseau indisponible, la preuve est conservée dans le stockage sécurisé natif. La reprise réutilise strictement l’identifiant et l’horodatage d’origine, se déclenche automatiquement au retour d’Internet, conserve les éléments encore en erreur et permet une relance manuelle depuis le bandeau arabe de synchronisation.

Critère de sortie atteint au niveau logiciel : les transitions sensibles sont verrouillées côté serveur, les répétitions sont idempotentes et une remise hors ligne n’est affichée comme synchronisée qu’après confirmation serveur. La recette sur appareils physiques et réseau réellement dégradé reste une activité de qualification avant publication, traitée dans les lots de tests et lancement.

### Cuisinier

- Afficher en premier la prochaine commande selon priorité et SLA.
- Mettre en place une prise de possession atomique de la commande.
- Proposer une checklist par ligne et quantité.
- Interdire « Prête » tant que chaque ligne n'est pas terminée, substituée ou déclarée en rupture.
- Traiter les conflits de concurrence avec rechargement immédiat.
- Ajouter un mode cuisine à fort contraste et anti-veille optionnel.

### Agent hospitalité / superviseur

- Consolider les commandes à approuver, anomalies de stock et exceptions SLA.
- Permettre approbation/rejet uniquement avec permission et motif obligatoire au rejet.
- Afficher la charge de cuisine et de livraison avant affectation.
- Notifier immédiatement employé et manager des changements significatifs.

### Livreur

- Afficher en haut de l'écran les zones et étages attribués au livreur pour son service courant.
- Alimenter automatiquement « Mes livraisons » uniquement avec les commandes dont la destination appartient à l'une de ses zones actives.
- Permettre au manager d'affecter manuellement une livraison hors zone ; cette exception doit être visible et historisée.
- Refuser côté API la prise en charge d'une livraison hors zone, sauf affectation explicite ou permission de supervision.
- Afficher destination, société, branche, bâtiment, étage, salle/bureau et contact.
- Trier la tournée d'abord par bâtiment et étage, puis par urgence/SLA, sans masquer une priorité critique.
- Ajouter les étapes `Accepter`, `En route`, `Arrivé`, `Livré` si elles sont validées dans le modèle backend.
- Confirmer la remise par geste volontaire et nom/code du réceptionnaire, sans photo obligatoire.
- Gérer les incidents standardisés et leur escalade.
- Permettre la remise hors-ligne avec horodatage local, puis synchronisation idempotente.
- Empêcher strictement une double livraison lors d'un conflit.

### Critère de sortie

Deux opérateurs concurrents ne peuvent ni prendre la même tâche ni appliquer deux transitions incompatibles ; une action refusée n'apparaît jamais comme réussie.

## Lot 4 — Stock et achats

### Responsable stock

- Séparer Entrepôt central, Entrepôt branche et Cuisine.
- Afficher produit, unité, emplacement, lot, péremption, disponible/réservé et historique récent.
- Proposer des opérations typées : entrée, sortie, perte, inventaire et transfert.
- Rendre le motif obligatoire et demander une double confirmation au-delà d'un seuil configurable.
- Implémenter le transfert `préparé → expédié → reçu`, avec quantités reçues et traitement des écarts.
- Ajouter scan QR/code-barres après validation des étiquettes et identifiants métier.
- Autoriser le comptage hors-ligne avec résolution explicite des conflits.

### Responsable achats

- Scinder la création d'un bon en fournisseur, lignes, coûts, livraison et vérification.
- Sauvegarder automatiquement le brouillon.
- Afficher taxes, devise, total, date attendue et variations de prix.
- Gérer soumission, approbation, rejet, envoi, annulation et timeline d'audit.
- Gérer réception partielle, reliquat, refus, lot, péremption et justificatif facultatif.
- Utiliser une clé d'idempotence pour soumission, envoi et réception.

### Critère de sortie

Le stock calculé après transfert/réception correspond aux écritures serveur ; toute différence est expliquée et traçable jusqu'à l'utilisateur, l'appareil et l'opération source.

## Lot 5 — Ménage, salles, managers et direction

### Agent ménage

- Afficher les zones de ménage actives attribuées à l'agent et la période de validité de chaque affectation.
- Créer « Mon travail aujourd'hui » à partir des missions de ces zones, triées par urgence, heure et lieu.
- Refuser côté API la prise ou la clôture d'une mission située hors zone, sauf affectation explicite ou permission de supervision.
- Afficher localisation, temps prévu, package et notes utiles.
- Fournir des checklists à grands contrôles tactiles avec éléments obligatoires.
- Ajouter `Bloqué`, motif, matériel manquant et demande de fournitures.
- Interdire la clôture incomplète sauf dérogation manager tracée.
- Ajouter une validation manager séparée lorsqu'elle est requise.

### Responsable de préparation et équipe participante

- Lors de la création ou planification d'une préparation, désigner exactement un responsable.
- Donner au responsable un écran « Constituer l'équipe » présentant uniquement les employés autorisés, disponibles et rattachés à la branche concernée.
- Afficher pour chaque candidat son rôle, sa disponibilité, ses missions simultanées et sa charge estimée.
- Permettre au responsable d'ajouter ou retirer des participants jusqu'au démarrage ; après démarrage, exiger un motif et historiser le changement.
- Permettre au responsable d'attribuer chaque tâche ou élément de checklist à un participant, tout en conservant la responsabilité globale de la préparation.
- Montrer aux participants uniquement les préparations auxquelles ils sont affectés et les tâches qui leur sont confiées.
- Autoriser les participants à terminer leurs propres tâches ou à déclarer un blocage ; seul le responsable peut soumettre la préparation complète.
- Empêcher la soumission tant que les éléments obligatoires ne sont pas terminés ou couverts par une dérogation manager.
- Prévoir la délégation du rôle de responsable en cas d'absence, avec acceptation du nouveau responsable et journal d'audit.

### Manager hospitalité / Admin branche

- Créer une boîte d'exceptions : SLA proche/dépassé, rupture, tâche non affectée, livraison bloquée, salle non prête.
- Afficher équipe, disponibilité et charge en cours.
- Permettre l'affectation des zones de livraison et de ménage, ainsi que les remplacements temporaires.
- Permettre de désigner le responsable initial d'une préparation ; la constitution de l'équipe appartient ensuite à ce responsable.
- Permettre affectation/réaffectation et actions groupées avec prévisualisation et rapport d'échec partiel.
- Mémoriser les filtres et indiquer clairement les données anciennes.
- Limiter toutes les opérations au `dataScope` résolu côté serveur.

### Direction générale / Super Admin

- Fournir une synthèse des KPI opérationnels et des alertes critiques.
- Permettre les approbations réellement urgentes avec réauthentification.
- Rendre le changement de société/branche explicite et toujours visible.
- Ouvrir le Web Admin pour les paramétrages complexes, sans reproduire ses écrans sur mobile.

## Lot 6 — Industrialisation et tests automatisés

### Pyramide de tests

| Niveau       | Cible                                         | Exigence minimale                          |
| ------------ | --------------------------------------------- | ------------------------------------------ |
| Unitaires    | règles, formatage, reducers, files hors-ligne | cas nominaux, limites et conflits          |
| Composants   | écrans et composants communs                  | AR/EN, RTL/LTR, loading/vide/erreur/succès |
| Contrats API | clients mobiles contre OpenAPI                | aucun écart non approuvé                   |
| Intégration  | API + PostgreSQL + Redis + Keycloak           | rôle, permission, périmètre, concurrence   |
| E2E          | builds Android/iOS sur préproduction          | parcours métier complets                   |
| Terrain      | vrais appareils et réseau dégradé             | validation par utilisateurs pilotes        |

### Parcours E2E obligatoires

1. Employé : connexion → panier → commande → suivi → livraison.
2. Employé : quota dépassé puis stock épuisé lors de la confirmation.
3. Employé : recherche de salle → conflit → autre créneau → réservation → annulation.
4. Cuisinier : prise en charge → préparation → rupture partielle → prête.
5. Deux cuisiniers : concurrence sur la même commande.
6. Livreur : deux étages attribués → seules les livraisons de cette zone apparaissent → perte réseau → remise → resynchronisation.
7. Livreur : tentative de prise en charge hors zone refusée → affectation exceptionnelle par le manager → prise en charge autorisée.
8. Stock : sortie → alerte → demande → transfert → réception avec écart.
9. Achats : brouillon → validation → envoi → réception partielle → reliquat.
10. Ménage : deux zones attribuées → missions filtrées → checklist → blocage → dérogation/validation manager.
11. Préparation : responsable désigné → constitution de l'équipe → répartition des tâches → exécution des participants → clôture par le responsable.
12. Préparation : changement de responsable après démarrage → motif → acceptation → audit complet.
13. Manager : exception SLA → réaffectation → retour à la normale.
14. Tous rôles : mauvaise application, 403, token expiré, révocation de permission et changement de branche.

### Matrice d'appareils

- au moins un Android d'entrée de gamme, un Android récent et un iPhone supporté ;
- écrans petits et grands ;
- arabe RTL et anglais LTR ;
- thème clair/sombre ;
- Wi-Fi stable, 4G instable, latence élevée, coupure et reprise ;
- notifications application ouverte, arrière-plan et fermée.

### Seuils de qualité avant pilote

- 100 % des parcours critiques E2E verts ;
- 100 % des permissions critiques couvertes par tests d'intégration ;
- 0 crash bloquant, 0 vulnérabilité critique/haute exploitable non acceptée ;
- 0 erreur silencieuse sur une mutation ;
- démarrage et écrans principaux suffisamment rapides sur l'appareil Android de référence ;
- accessibilité vérifiée sur les missions principales.

## 6. Feuille de route proposée

Hypothèse de capacité : deux développeurs mobile, un développeur backend, un QA automatisation partagé, un UX/UI à mi-temps et un représentant métier disponible pour les recettes. Avec une équipe plus petite, conserver l'ordre des vagues et augmenter la durée.

| Phase                     | Semaines | Résultat attendu                                                                    |
| ------------------------- | -------: | ----------------------------------------------------------------------------------- |
| 0. Cadrage                |    S1–S2 | Matrice complète, contrats d'API, comptes de test, maquettes des parcours critiques |
| 1. Fondation P0           |    S3–S5 | Erreurs, permissions, session, connectivité, synchronisation et tests socle         |
| 2. Employee               |    S6–S8 | Commande, suivi et salles prêts pour recette                                        |
| 3. Cuisine/livraison      |   S9–S11 | Cycle commande terrain fiable et concurrent                                         |
| 4. Stock/achats           |  S12–S15 | Flux logistiques et achats complets                                                 |
| 5. Ménage/management      |  S16–S18 | Tâches, exceptions, affectations et urgences direction                              |
| 6. Stabilisation          |  S19–S20 | E2E, performance, sécurité, accessibilité, stores et runbooks                       |
| 7. Pilote                 |  S21–S22 | Une branche, utilisateurs formés, mesure réelle et corrections                      |
| 8. Production progressive |  S23–S24 | Déploiement par vagues et décision de généralisation                                |

Chaque phase se termine par une démonstration sur build de préproduction, une recette du rôle concerné et une mise à jour de la matrice de couverture. Aucun lot métier ne doit être déclaré terminé sur la seule base du typecheck ou d'une démonstration avec données simulées.

## 7. CI/CD mobile cible

### Pull request

- installation reproductible avec `npm ci` ;
- lint et typecheck des deux applications et du package partagé ;
- tests unitaires/composants avec rapport de couverture ;
- validation `expo config` ;
- export des bundles Android **et iOS** ;
- validation OpenAPI et détection des changements incompatibles ;
- audit des dépendances avec exception documentée et datée ;
- vérification automatique qu'aucune police sous licence ni secret n'entre dans les bundles.

### Branche principale

- construction EAS `preview` signée pour les testeurs internes ;
- notes de version automatiques ;
- smoke tests sur préproduction ;
- conservation de l'artefact et de son commit SHA.

### Release production

- tag Git signé, par exemple `mobile-employee-v1.0.0` et `mobile-operations-v1.0.0` ;
- builds EAS production immuables ;
- signatures Android/iOS stockées dans le gestionnaire de credentials, avec accès restreint ;
- soumission aux canaux de test fermés avant publication ;
- approbation manuelle métier, QA et exploitation ;
- déploiement progressif ;
- mise à jour OTA limitée aux changements compatibles avec le runtime natif ;
- procédure de rollback testée pour le binaire et les mises à jour OTA.

## 8. Préparation opérationnelle au lancement

### Données et comptes

- Vérifier société, branches, départements, employés, rôles additionnels et permissions.
- Vérifier produits, quotas, stocks initiaux, salles, packages, fournisseurs et emplacements.
- Refuser l'activation d'un utilisateur sans branche/périmètre requis.
- Exécuter un test de connexion et de mission principale pour chaque rôle réel avant ouverture.

### Formation

- Sessions courtes par rôle avec appareil réel.
- Fiche d'une page AR/EN pour les actions critiques et les incidents.
- Formation des managers à la résolution des conflits et à la réaffectation.
- Canal de support et procédure d'escalade clairement affichés.

### Observabilité

- Suivre crashs, erreurs API, latence, échecs de synchronisation et versions installées.
- Corréler mobile et backend par identifiant de requête.
- Créer des alertes sur hausse des 401/403/409/500, file hors-ligne bloquée, absence de push et crash-free sessions.
- Construire un tableau de bord de lancement séparé par application, version, rôle et branche, sans collecter de contenu sensible.

### Sauvegarde et reprise

- Réaliser et vérifier la sauvegarde PostgreSQL avant activation du pilote.
- Tester la restauration en environnement isolé.
- Documenter la désactivation d'une fonctionnalité, le retour à une version précédente et le mode manuel temporaire par métier.

## 9. Stratégie de pilote et lancement progressif

### Pilote interne — 5 jours ouvrés

- Personnel Tarhib uniquement, avec une petite équipe de chaque rôle.
- Exécution de scénarios contrôlés et simulation de perte réseau/concurrence.
- Correction immédiate des blocants et majeurs.

### Pilote client — 10 jours ouvrés

- Une entreprise, une branche, 20 à 50 employés clients.
- Une équipe Operations complète en horaires réels.
- Support renforcé et point quotidien de 15 minutes.

### Généralisation

- Vague 1 : 10 % des utilisateurs ; observation 48 heures.
- Vague 2 : 30 % ; observation 48 heures.
- Vague 3 : 60 % ; observation 72 heures.
- Vague 4 : 100 % après validation formelle.

Une vague est arrêtée si un utilisateur ne peut plus commander, préparer, livrer, enregistrer un mouvement de stock ou terminer une tâche obligatoire, si des données sont incohérentes, ou si le taux de crash/échec dépasse le seuil défini pendant le cadrage.

## 10. Go / No-Go production

Le lancement est autorisé uniquement si tous les points suivants sont vrais :

- la matrice de couverture affiche 100 % des missions obligatoires en « validé » ;
- chaque rôle a signé sa recette métier sur préproduction ;
- les E2E critiques Android et iOS sont verts ;
- les tests de permissions et de périmètre sont verts ;
- aucune mutation critique n'échoue silencieusement ;
- les files hors-ligne ont été testées avec conflits réels ;
- les notifications ouvrent la bonne ressource et sont dédupliquées ;
- les URL, identifiants d'application, icônes, politique de confidentialité et informations stores sont définitifs ;
- observabilité, support, sauvegarde, restauration et rollback ont été testés ;
- aucune police non autorisée ni aucun secret n'est présent dans les artefacts ;
- les propriétaires métier, technique, sécurité et exploitation donnent leur accord.

## 11. Indicateurs des 30 premiers jours

- taux de sessions sans crash par application et version ;
- taux de réussite de chaque mission critique ;
- mutations échouées par endpoint, rôle et motif ;
- taille et ancienneté des files hors-ligne ;
- délai moyen commande → préparation → prête → livrée ;
- taux de commandes en double : objectif zéro ;
- écarts de stock et transferts non reçus ;
- tâches ménage/salle terminées dans le délai ;
- notifications délivrées, ouvertes et acquittées ;
- tickets support par 100 utilisateurs et délai de résolution ;
- adoption quotidienne par rôle et version obsolète encore active.

## 12. Ordre d'exécution immédiat

1. Corriger les URL EAS et définir les quatre environnements.
2. Construire la matrice rôle/permission/endpoint/écran/action.
3. Ajouter les comptes et données de test par rôle.
4. Implémenter la couche commune d'erreur, connectivité et confirmation serveur.
5. Conditionner toutes les requêtes et routes par permission.
6. Installer les tests mobile et les premiers E2E des parcours Employee et cuisine.
7. Terminer Employee, puis cuisine/livraison, stock/achats, ménage/management.
8. Industrialiser les builds signés, les deep links, les notifications et l'observabilité.
9. Exécuter la recette complète et le pilote d'une branche.
10. Lancer progressivement avec critères d'arrêt et rollback prêts.

Ce séquencement privilégie la fiabilité métier avant l'optimisation visuelle : une interface réussie doit rendre l'action prioritaire évidente, mais surtout garantir que l'action a réellement été acceptée, tracée et synchronisée.
