# Guide utilisateur exhaustif — Tarhib Web Admin

**Version du guide :** 1.0  
**Date :** 7 août 2026  
**Périmètre :** Web Admin Tarhib, Tarhib Employee et Tarhib Operations  
**Public :** administrateurs, responsables métiers, managers, équipes RH/finance/comptabilité, agents opérationnels et support

---

## 1. Objet du guide

Ce guide explique comment utiliser l’intégralité du Web Admin Tarhib, qui peut accéder à chaque module, quelles actions sont possibles et quels effets les rôles et permissions configurés dans l’administration ont dans les applications mobiles.

Il décrit le comportement de la version actuellement implémentée. Lorsqu’une permission agit surtout sur l’application Tarhib Operations et ne donne pas directement accès à une page du Web Admin, cela est précisé.

## 2. Principes d’accès à connaître

### 2.1 Rôle principal, rôles additionnels et permissions

Chaque utilisateur possède :

- un rôle principal ;
- éventuellement plusieurs rôles additionnels ;
- l’union de toutes les permissions portées par ces rôles.

Les permissions sont cumulatives : ajouter un rôle ne retire jamais les droits du rôle principal. Il n’existe pas de permission de refus prioritaire. Pour réduire les droits, il faut retirer le rôle ou modifier ses permissions.

Les comptes clients reçoivent automatiquement les droits mobiles de base suivants : catalogue, favoris, création et consultation de leurs commandes, recommander, quotas, notifications et profil. Le rôle client ajoute notamment le niveau SLA, les quotas produits et l’accès aux salles.

### 2.2 Portée des données

Les permissions déterminent aussi le périmètre visible :

| Portée  | Règle                                                              | Conséquence                                                                                         |
| ------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Globale | `company.manage` ou `operations.global.supervise`                  | Toutes les sociétés et branches autorisées par le backend ; sélecteurs société/branche disponibles. |
| Société | `operations.company.supervise`                                     | Toutes les branches de la société de l’utilisateur.                                                 |
| Branche | personnel Tarhib, `branch.manage` ou `operations.branch.supervise` | Données de la branche affectée.                                                                     |
| Propre  | utilisateur client sans droit de supervision                       | Uniquement ses propres données et actions.                                                          |

Un menu visible ne remplace jamais le contrôle serveur : chaque requête est à nouveau vérifiée par l’API. Une URL saisie directement peut afficher « accès refusé » ou recevoir une erreur 403.

### 2.3 Rôles Tarhib et rôles clients

- **Rôle Tarhib** : destiné au personnel interne. Il est composé de permissions fonctionnelles sélectionnables.
- **Rôle client** : rattaché à une société. Il configure la priorité/SLA, les quotas, les produits concernés et l’accès aux salles. La réservation de salle est la permission client explicitement activable dans le formulaire de rôle.

### 2.4 Effet d’une modification de rôle

Après une modification, l’utilisateur doit actualiser son profil d’accès ; une reconnexion est recommandée si le changement n’apparaît pas immédiatement. Les menus mobiles sont reconstruits à partir du profil retourné par l’API. Les appels serveur restent protégés même si un ancien écran est encore présent dans le cache.

---

## 3. Connexion et navigation générale

### 3.1 Se connecter

1. Ouvrir le Web Admin.
2. Saisir l’adresse e-mail et le mot de passe.
3. Sélectionner **Se connecter**.
4. En cas d’échec, vérifier les identifiants, le statut actif du compte et son affectation à une société/branche.

L’authentification est assurée par Keycloak. Les droits fonctionnels sont ensuite enrichis depuis Tarhib.

### 3.2 Structure de l’écran

- **Menu latéral** : uniquement les modules autorisés.
- **Fil d’Ariane** : position dans l’administration.
- **Recherche globale** : recherche une page autorisée ; raccourci `Ctrl+K` ou `Cmd+K`.
- **Sélecteur de périmètre** : société et branche quand la portée le permet.
- **Cloche/rail de notifications** : événements administratifs et alertes.
- **Profil** : informations du compte, langue, thème et déconnexion.
- **Thème** : clair ou sombre.
- **Langue** : anglais ou arabe dans l’interface actuelle, avec bascule LTR/RTL.

### 3.3 Interactions communes

- Cliquer sur une ligne ouvre généralement son détail ou son formulaire.
- Les filtres réduisent la liste sans modifier les données.
- **Ajouter** ouvre un formulaire de création.
- **Modifier** préremplit le formulaire.
- **Supprimer** ouvre une confirmation ; l’action peut être refusée si l’objet est déjà utilisé.
- Les statuts sont affichés par badges colorés.
- Les opérations longues affichent un indicateur de chargement.
- Les exports CSV reprennent le périmètre et les filtres courants.
- Les champs société puis branche sont dépendants : changer de société réinitialise la branche.

---

## 4. Tableau de bord

**Accès :** tout utilisateur authentifié du Web Admin. Les chiffres retournés restent limités à son périmètre.

### Contenu

- indicateurs de commandes, quotas et activité ;
- répartition des commandes par statut ;
- tendances et comparaison avec la période précédente ;
- commandes récentes ;
- raccourcis vers la liste des commandes.

### Utilisation

1. Choisir le périmètre disponible.
2. Lire les cartes KPI et leurs variations.
3. Cliquer sur une catégorie ou sur **Voir les commandes** pour ouvrir le module Commandes.
4. Actualiser la page si un événement temps réel n’est pas encore répercuté.

Le tableau de bord ne donne pas implicitement le droit de modifier une commande.

---

## 5. Rôles et permissions

**Accès Web :** `role.manage`.  
**Action de test :** `role.impersonate`.  
**Effet :** définit les menus, actions, capacités mobiles et portées de données.

### 5.1 Consulter et filtrer les rôles

- Utiliser l’onglet **Tarhib** pour les rôles internes.
- Utiliser l’onglet **Client** puis sélectionner une société pour ses rôles clients.
- Rechercher par nom.
- Filtrer les rôles Tarhib par permissions ; toutes les permissions sélectionnées doivent être présentes.
- Filtrer les rôles clients avec ou sans quotas.
- Trier par date ou nom.
- Cliquer sur une carte pour afficher le détail : type, permissions, SLA, salles et quotas.

### 5.2 Créer ou modifier un rôle Tarhib

1. Sélectionner **Créer un rôle** ou **Modifier**.
2. Saisir le nom arabe obligatoire et le nom anglais facultatif.
3. Choisir le type **Tarhib**.
4. Rechercher les permissions ou les sélectionner par groupe.
5. Vérifier les permissions sensibles : sociétés, rôles, employés, finance, comptabilité, RH et validation des achats.
6. Enregistrer.

### 5.3 Créer ou modifier un rôle client

1. Choisir la société propriétaire du rôle.
2. Saisir les noms du rôle.
3. Configurer le niveau SLA/priorité disponible pour cette société.
4. Activer ou désactiver la réservation de salles.
5. Autoriser toutes les salles ou une sélection de salles.
6. Ajouter des quotas : produit, quantité et période journalière, hebdomadaire ou mensuelle.
7. Enregistrer.

Un rôle client n’est utilisable que pour les employés de sa société.

### 5.4 Configurer les niveaux SLA

Dans l’espace client d’une société :

- ajouter un niveau ;
- définir son code, son libellé et son délai ;
- modifier ou supprimer un niveau ;
- enregistrer la configuration.

Le SLA influence la priorité et l’échéance des commandes dans les files opérationnelles. Il n’est pas affiché comme engagement à l’employé dans le parcours Employee.

### 5.5 Tester un rôle

Avec `role.impersonate`, sélectionner **Tester ce rôle** et confirmer. Le Web Admin simule les permissions du rôle sans changer l’identité réelle de l’administrateur. Un bandeau indique l’impersonation. Sélectionner **Arrêter le test** pour restaurer le profil réel.

### 5.6 Supprimer un rôle

La suppression requiert confirmation. Avant de supprimer, réaffecter les employés utilisant ce rôle. Les rôles système ou les rôles encore référencés peuvent être protégés par le serveur.

---

## 6. Sociétés

**Accès Web :** `company.manage`.  
**Impact :** crée le tenant auquel seront rattachés branches, employés clients, rôles, produits, contrats, quotas et salles.

### Actions

- lister et rechercher les sociétés ;
- créer une société avec noms arabe/anglais et état actif ;
- modifier ses informations ;
- activer ou désactiver la société ;
- supprimer après confirmation si aucune dépendance bloquante n’existe.

Désactiver une société doit être préféré à la suppression lorsqu’elle possède un historique. Une société inactive ne doit plus être utilisée pour de nouvelles opérations.

---

## 7. Branches

**Accès Web :** `company.manage` ou `branch.manage`.

### Actions

- filtrer par société ;
- créer une branche et la rattacher à une société ;
- renseigner noms, code/adresse et responsable selon les champs proposés ;
- activer/désactiver ;
- modifier ;
- supprimer après confirmation.

La branche pilote le cloisonnement opérationnel : stock, commandes, salles, employés et reporting. Un responsable de branche ne voit que son périmètre, sauf permission globale supplémentaire.

---

## 8. Départements

**Accès Web :** `company.manage` ou `branch.manage`.

### Actions

- filtrer société puis branche ;
- créer un département dans une branche ;
- renseigner les noms et l’état actif ;
- modifier ou supprimer.

Le département sert à organiser les employés clients et peut être utilisé dans les réservations, le VIP et les rapports.

---

## 9. Employés clients

**Accès Web :** `employee.manage`.  
**Salaire visible :** `employee.salary.manage` lorsque le champ est applicable.  
**Connexion en tant qu’employé :** `employee.impersonate`.

### Actions de liste

- filtrer par société, branche, département, rôle et statut ;
- rechercher un employé ;
- ouvrir une ligne pour afficher le détail ;
- créer, modifier, désactiver ou supprimer un employé.

### Créer/modifier

1. Renseigner identité arabe/anglaise, e-mail et téléphone.
2. Choisir la société, puis la branche et le département.
3. Choisir le rôle principal client.
4. Ajouter, si nécessaire, des rôles additionnels compatibles.
5. Définir le statut actif.
6. Enregistrer.

### Impacts sur Tarhib Employee

- la société détermine le catalogue, les salles et la configuration ;
- la branche détermine disponibilité, stock et exécution de la commande ;
- le rôle détermine SLA, quotas et salles accessibles ;
- un compte désactivé ne peut plus s’authentifier ;
- les rôles additionnels cumulent les permissions.

### Désactiver ou supprimer

- **Désactiver** conserve l’historique et bloque l’usage futur ; c’est l’action recommandée.
- **Supprimer** est réservé aux fiches créées par erreur et peut être refusé si des commandes ou réservations existent.

---

## 10. Employés internes Tarhib

**Accès Web :** `employee.manage`.

Le fonctionnement est identique à celui des employés clients, avec les différences suivantes :

- le périmètre est **Tarhib** ;
- le rôle principal est un rôle interne ;
- la branche d’affectation limite généralement les données Operations ;
- les rôles additionnels permettent de combiner, par exemple, Cuisinier + consultation stock ;
- les permissions construisent dynamiquement les modules de Tarhib Operations.

Vérifier soigneusement les permissions `company.manage`, `role.manage`, `finance.manage`, `accounting.manage`, `employee.salary.manage` et les droits de validation d’achats avant l’enregistrement.

---

## 11. Inscriptions et invitations

**Accès Web :** `employee.manage`.

### Demandes en attente

- consulter les inscriptions ;
- ouvrir **Approuver**, choisir branche, département et rôle, puis confirmer ;
- sélectionner **Rejeter** pour refuser la demande.

L’approbation rend le compte exploitable avec le périmètre et les droits choisis. Le rejet conserve la trace de la décision selon la politique d’audit.

### Inviter un employé

1. Ouvrir l’onglet **Inviter**.
2. Choisir le type d’employé et son organisation.
3. Renseigner identité, e-mail/téléphone et rôle.
4. Envoyer l’invitation.
5. L’utilisateur finalise son compte via le canal reçu.

---

## 12. Catalogue produits

**Accès Web :** `company.manage` dans le Web Admin actuel.

### Actions

- consulter et rechercher les produits ;
- créer ou modifier un produit ;
- définir noms arabe/anglais, description, catégorie, image et disponibilité ;
- définir les unités, indicateurs de stock, informations nutritionnelles et allergènes proposés ;
- limiter le produit à certaines branches ou certains rôles ;
- activer/désactiver ;
- supprimer après confirmation ;
- ouvrir le détail et gérer la recette/les ingrédients ;
- ajouter une ligne de recette avec produit ingrédient et quantité ;
- retirer une ligne de recette.

### Effets mobiles

- un produit inactif, non autorisé pour la branche/le rôle ou indisponible en stock disparaît ou devient non commandable dans Tarhib Employee ;
- l’image, les traductions, allergènes et nutrition alimentent la fiche produit ;
- la recette détermine les consommations/réservations de stock ;
- une rupture de stock de branche rend le produit indisponible côté client ;
- les prix fournisseurs servent aux bons de commande et aux rapports d’achat.

---

## 13. Commandes

**Accès au menu Web :** tout utilisateur Web authentifié ; les données et transitions restent contrôlées par le backend.  
**Permissions opérationnelles principales :** `order.queue.view`, `order.queue.manage`, `order.prepare`, `order.deliver`, `order.stockout.report`.

### Consulter

- filtrer par statut, société, branche et autres critères disponibles ;
- ouvrir une commande pour voir client, lignes, commentaire, priorité, SLA et historique ;
- exporter la vue en CSV ;
- suivre la chronologie des statuts.

### Cycle et actions

| Statut courant          | Action                  | Nouveau statut | Acteur typique                     |
| ----------------------- | ----------------------- | -------------- | ---------------------------------- |
| `PENDING`               | Approuver               | `APPROVED`     | manager/file avec droit de gestion |
| `PENDING`               | Rejeter avec motif      | `REJECTED`     | manager/file avec droit de gestion |
| `PENDING` ou `APPROVED` | Annuler selon règles    | `CANCELLED`    | acteur autorisé                    |
| `APPROVED`              | Démarrer la préparation | `IN_PROGRESS`  | cuisinier, `order.prepare`         |
| `IN_PROGRESS`           | Marquer prête           | `READY`        | cuisinier, `order.prepare`         |
| `READY`                 | Marquer livrée          | `DELIVERED`    | livreur, `order.deliver`           |

Chaque transition est horodatée et alimente le suivi temps réel. Les actions non valides pour le statut courant sont absentes ou rejetées.

### Effets sur Tarhib Employee

- l’approbation/rejet et le motif apparaissent dans **Mes commandes** ;
- préparation, prête et livrée mettent à jour le suivi ;
- la livraison clôt le parcours ;
- l’annulation libère les réservations selon les règles serveur ;
- l’employé peut recommander depuis l’historique si son droit de commande et la disponibilité le permettent.

---

## 14. Quotas

**Accès au menu Web :** tout utilisateur Web authentifié ; l’API limite la portée.  
**Droit mobile de consultation :** `quota.view` ; les clients le reçoivent dans le socle de base.

### Actions

- filtrer par société ;
- consulter quota, consommation, restant et progression ;
- créer un quota pour un employé/produit et une période ;
- modifier quantité ou période ;
- supprimer après confirmation ;
- exporter en CSV ;
- accéder aux rôles pour gérer les quotas collectifs.

### Périodes

- journalière ;
- hebdomadaire ;
- mensuelle.

### Effets mobiles

- le restant apparaît dans le catalogue, la fiche produit et le profil ;
- atteindre la limite désactive l’ajout ou provoque un refus explicite lors de la validation ;
- une commande consomme le quota de façon transactionnelle ;
- rejet/annulation restaure la consommation conformément aux règles serveur ;
- les quotas de rôle s’appliquent à tous les employés portant ce rôle, tandis qu’un quota individuel cible un employé.

---

## 15. Salles de réunion

**Accès Web :** `branch.manage` ou `company.manage`.  
**Accès Employee :** `meeting.book`.

### Administration des salles

- filtrer par société/branche ;
- créer une salle ;
- définir noms, capacité, équipements, localisation et disponibilité ;
- modifier ;
- supprimer si aucune dépendance ne bloque ;
- ouvrir une salle pour consulter ses réservations et leurs statuts.

### Effets mobiles

- seules les salles actives, autorisées au rôle et disponibles sont proposées ;
- la capacité doit couvrir le nombre de participants ;
- les créneaux déjà réservés ne sont plus disponibles ;
- retirer `meeting.book` supprime l’onglet **Réserver** de Tarhib Employee ;
- `meeting.manage` permet les fonctions client de gestion des réunions prévues par l’API ;
- `meeting.order_services` autorise l’ajout de services à la réservation.

---

## 16. Packages de services de réunion

**Accès Web :** `branch.manage` ou `company.manage`.

### Actions

- filtrer par société ;
- créer un package ;
- saisir noms, description, contenu, prix et état actif selon le formulaire ;
- modifier ou supprimer.

Les packages actifs sont proposés dans le parcours de réservation : petit déjeuner, déjeuner ou composition personnalisée. La disponibilité mobile requiert `meeting.order_services`.

---

## 17. Stock et inventaire

**Accès Web actuel :** `inventory.manage` ou `company.manage`.  
**Droits granulaires mobiles/API :** `inventory.view`, `inventory.create`, `inventory.update`, `inventory.adjust`, `stock.view`, `stock.manage`, `stock.kitchen.view`.

### Zones

- entrepôt central ;
- entrepôt de branche ;
- cuisine ;
- zones complémentaires configurées, dont VIP.

### Actions

- filtrer société, branche, produit et zone ;
- consulter quantité, minimum, maximum et statut ;
- créer une entrée de stock ;
- modifier les seuils et métadonnées ;
- ajuster la quantité avec type de mouvement et motif obligatoire ;
- consulter les onglets par zone ;
- repérer les articles sous seuil.

### Bonnes pratiques

- utiliser une entrée/sortie/transfert correspondant au mouvement réel ;
- réserver **Ajustement** aux corrections d’inventaire ;
- écrire un motif exploitable pour l’audit ;
- ne pas corriger une réception fournisseur par une modification silencieuse.

### Effets mobiles

- le stock de branche conditionne immédiatement la disponibilité catalogue ;
- le stock bas génère une alerte Operations ;
- `stock.kitchen.view` affiche le stock cuisine ;
- `stock.kitchen.request` permet une demande de réapprovisionnement ;
- `stock.manage`/`inventory.manage` permet les ajustements selon l’écran ;
- toutes les opérations sont historisées.

---

## 18. Transferts de stock

**Accès Web actuel :** `inventory.manage` ou `company.manage`.  
**Droits granulaires :** `inventory.transfer.view`, `.create`, `.confirm`, `.cancel` ou droit agrégé `stock.transfer`/`inventory.manage` selon l’API.

### Actions

1. Créer un transfert.
2. Choisir société, branche, zone source, zone destination, produit et quantité.
3. Enregistrer : statut `PENDING`.
4. Ouvrir la ligne pour consulter le détail et la chronologie.
5. **Confirmer** pour appliquer le mouvement : statut `CONFIRMED`.
6. **Annuler** tant que le transfert est en attente : statut `CANCELLED`.

La quantité source est contrôlée. Une confirmation modifie les deux stocks et devient visible dans Tarhib Operations et dans la disponibilité client.

---

## 19. Fournisseurs

**Accès Web actuel :** `inventory.manage` ou `company.manage`.

### Actions

- créer, modifier ou supprimer un fournisseur ;
- gérer identité, coordonnées et statut ;
- ouvrir **Prix produits** ;
- ajouter produit, prix et unité d’achat ;
- modifier/supprimer une ligne puis enregistrer.

Les prix configurés préremplissent les lignes d’un bon de commande et alimentent les analyses d’achat. Un fournisseur déjà utilisé doit être désactivé plutôt que supprimé.

---

## 20. Achats et bons de commande

**Accès Web actuel au menu :** `inventory.manage` ou `company.manage`.  
**Permissions métier :** `procurement.view`, `.create`, `.edit_draft`, `.submit`, `.validate`, `.reject`, `.send`, `.cancel`, `.receive`, `.cost.view`, ou permission agrégée `.manage`.

### Créer un bon de commande

1. Sélectionner fournisseur, société et branche de livraison.
2. Ajouter une ou plusieurs lignes produit.
3. Saisir quantités, unités et prix ; les prix fournisseur peuvent être proposés.
4. Enregistrer en brouillon.

### Cycle

| Statut                         | Action disponible    | Résultat             |
| ------------------------------ | -------------------- | -------------------- |
| `DRAFT`                        | Modifier / soumettre | `PENDING_VALIDATION` |
| `PENDING_VALIDATION`           | Valider              | `VALIDATED`          |
| `PENDING_VALIDATION`           | Rejeter avec motif   | `REJECTED`           |
| `VALIDATED`                    | Envoyer              | `SENT`               |
| `SENT`                         | Réception partielle  | `PARTIALLY_RECEIVED` |
| `SENT` ou `PARTIALLY_RECEIVED` | Réception complète   | `RECEIVED`           |
| tout statut non final autorisé | Annuler              | `CANCELLED`          |

### Autres interactions

- filtrer par statut, société et branche ;
- ouvrir le détail et la chronologie ;
- exporter en CSV ;
- lors d’une réception, saisir la quantité réellement reçue pour chaque ligne.

La réception crée les mouvements de stock. La permission `procurement.cost.view` protège l’exposition des coûts sensibles.

---

## 21. Libre-service VIP

**Accès Web actuel :** `inventory.manage` ou `company.manage`.  
**Permissions mobiles/API :** `vip.location.view`, `vip.location.manage`, `vip.task.view`, `vip.task.complete`, `vip.view`, `vip.manage`.

### Emplacements VIP

- créer un emplacement rattaché à société, branche et éventuellement département ;
- affecter un agent ;
- ajouter des produits avec quantité et seuil ;
- modifier la quantité/seuil ;
- retirer un produit ;
- déclencher un réapprovisionnement en choisissant la zone source.

### Tâches VIP

- filtrer par statut `OPEN`, `IN_PROGRESS`, `COMPLETED` ;
- actualiser la liste ;
- ouvrir/terminer une tâche ;
- choisir la zone de prélèvement lors de l’exécution.

La finalisation déplace le stock vers l’emplacement VIP et actualise les alertes.

---

## 22. Rapports et analytics

**Accès Web :** `report.view`, `company.manage` ou `branch.manage`.

### Filtres globaux

- période ;
- granularité ;
- société ;
- branche ;
- filtres propres à chaque onglet.

### Onglets

| Onglet         | Contenu principal                                       |
| -------------- | ------------------------------------------------------- |
| Vue d’ensemble | KPI exécutifs, volumes, tendances et synthèses.         |
| Commandes      | volumes par statut, délais, SLA, produits et tendances. |
| Inventaire     | niveaux, mouvements, zones, seuils et produits.         |
| Quotas         | alloué, consommé, restant et taux d’utilisation.        |
| Activité       | actions/utilisateurs et activité administrative.        |
| Salles         | réservations, occupation, annulations et salles.        |
| Achats         | fournisseurs, produits, quantités et coûts autorisés.   |

Les rapports respectent la portée de l’utilisateur. Une permission de rapport n’accorde pas automatiquement les droits de modification des modules sources.

---

## 23. Journal d’audit

**Accès Web :** `company.manage`.

### Actions

- filtrer par type d’action, entité, acteur et période ;
- consulter date, utilisateur, action et cible ;
- ouvrir les détails avant/après lorsqu’ils sont disponibles ;
- exporter en CSV.

Utiliser l’audit pour vérifier une modification de rôle, un changement de statut, un ajustement de stock ou une opération administrative. L’audit est en lecture seule.

---

## 24. Finance

**Lecture :** `finance.view` ou `finance.manage`.  
**Écriture :** les appels de mutation exigent `finance.manage` côté API.

### 24.1 Vue d’ensemble

- choisir la période ;
- consulter revenus, dépenses, dettes, soldes et tendances ;
- filtrer selon le périmètre autorisé.

### 24.2 Contrats commerciaux

- créer/modifier un contrat société ;
- définir période, montant, conditions et statut `DRAFT`, `ACTIVE` ou `CANCELLED` ;
- repérer les contrats expirés ;
- supprimer après confirmation si autorisé.

### 24.3 Dépenses

- créer/modifier/supprimer une dépense ouverte ;
- rattacher société, employé, catégorie, montant, date et justificatif/référence selon le formulaire ;
- lancer la génération de paie ;
- fermer ou rouvrir une période ;
- corriger une écriture d’une période clôturée par contre-passation, sans modifier l’écriture historique.

### 24.4 Dettes

- créer/modifier/supprimer ;
- suivre montant, échéance et statuts `PENDING`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`.

### 24.5 Comptes financiers

- créer un compte ;
- modifier son libellé, type, solde initial et état ;
- supprimer après confirmation si aucune écriture ne l’empêche.

---

## 25. Comptabilité

**Lecture :** `accounting.view` ou `accounting.manage`.  
**Écriture/validation/clôture :** `accounting.manage`.

### 25.1 Plan comptable

- consulter la liste des comptes ;
- créer un compte avec code, nom, type et parent éventuel ;
- modifier et activer/désactiver.

### 25.2 Écritures de journal

1. Choisir l’exercice et la date.
2. Ajouter au moins deux lignes.
3. Sélectionner le compte, saisir débit ou crédit et description.
4. Vérifier que total débit = total crédit.
5. Enregistrer en `DRAFT`.
6. Valider pour passer en `POSTED`.

Une écriture validée n’est plus modifiable comme un brouillon.

### 25.3 Exercices

- consulter l’état `OPEN` ou `CLOSED` ;
- clôturer après contrôle ;
- rouvrir avec le droit de gestion lorsque la politique l’autorise.

### 25.4 Rapports comptables

- balance générale sur une période ;
- grand livre par compte ;
- bilan à une date ;
- compte de résultat sur une période.

---

## 26. Ressources humaines

### 26.1 Demandes de congé

**Accès :** `hr.leave.manage` ou `hr.leave.approve`.

- onglet demandes : créer une demande, consulter, approuver ou rejeter une demande `PENDING` ;
- onglet soldes : consulter les soldes par employé/type ;
- onglet types : créer ou modifier les types de congé.

`hr.leave.manage` gère les demandes et types ; `hr.leave.approve` autorise la décision. Le backend reste la source d’autorité si l’écran est accessible avec l’un des deux droits.

### 26.2 Contrats de travail

**Accès :** `hr.contract.manage`.

- créer/modifier un contrat ;
- choisir employé, dates, fonction, rémunération/conditions disponibles ;
- gérer `ACTIVE`, `ENDED`, `RENEWED`.

### 26.3 Évaluations de performance

**Accès :** `hr.review.manage`.

- créer/modifier une évaluation ;
- sélectionner employé, période, score et commentaires ;
- conserver en `DRAFT` ou passer en `FINALIZED`.

### 26.4 Bulletins de paie et fiscalité

**Accès :** `employee.salary.manage` ou `company.manage` pour la page ; les mutations sensibles sont contrôlées par l’API.

- consulter les bulletins et leurs lignes ;
- consulter les résultats de paie ;
- ouvrir la configuration fiscale ;
- modifier taux, seuils et paramètres de calcul disponibles.

---

## 27. Profil utilisateur

**Accès :** tout utilisateur authentifié.  
**Modification :** `profile.edit` ou `profile.manage` selon le canal.

Le profil présente identité, e-mail, société, branche, rôle principal, rôles additionnels et permissions. L’utilisateur peut modifier les informations autorisées, choisir langue/thème et se déconnecter. Les permissions sont informatives : elles se modifient dans **Rôles et permissions**, pas dans le profil.

---

## 28. Matrice des permissions Web Admin

| Page/groupe                                  | Permission d’entrée dans l’interface                              |
| -------------------------------------------- | ----------------------------------------------------------------- |
| Tableau de bord                              | Authentification                                                  |
| Rôles et permissions                         | `role.manage`                                                     |
| Sociétés, Produits, Audit                    | `company.manage`                                                  |
| Branches, Départements                       | `company.manage` ou `branch.manage`                               |
| Employés client/interne, Inscriptions        | `employee.manage`                                                 |
| Commandes                                    | Authentification ; actions contrôlées par droits commandes        |
| Quotas                                       | Authentification ; données/actions contrôlées par API             |
| Salles, Packages                             | `branch.manage` ou `company.manage`                               |
| Stock, Transferts, Fournisseurs, Achats, VIP | `inventory.manage` ou `company.manage` dans le routeur Web actuel |
| Rapports                                     | `report.view`, `company.manage` ou `branch.manage`                |
| Finance                                      | `finance.view` ou `finance.manage`                                |
| Comptabilité                                 | `accounting.view` ou `accounting.manage`                          |
| Congés                                       | `hr.leave.manage` ou `hr.leave.approve`                           |
| Contrats RH                                  | `hr.contract.manage`                                              |
| Évaluations                                  | `hr.review.manage`                                                |
| Bulletins                                    | `employee.salary.manage` ou `company.manage`                      |
| Profil                                       | Authentification                                                  |

**Important :** les permissions granulaires Operations 2.0 peuvent autoriser une action via API/mobile sans faire apparaître la page Web correspondante, car plusieurs routes Web utilisent encore les permissions agrégées `inventory.manage` ou `company.manage`.

---

## 29. Impact détaillé des permissions dans Tarhib Employee

| Permission/capacité                | Effet utilisateur                                                           |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `catalog.view`                     | Affiche l’accueil/catalogue et les produits autorisés.                      |
| `favorite.manage`                  | Permet d’ajouter/retirer des favoris.                                       |
| `order.create`                     | Affiche/utilise le panier et permet de confirmer une commande.              |
| `order.view_own` ou `order.create` | Permet de voir ses propres commandes et leur suivi.                         |
| `order.reorder` ou `order.create`  | Permet de remettre les lignes d’une ancienne commande dans le panier.       |
| `quota.view`                       | Affiche quotas, consommation et restant.                                    |
| `meeting.book`                     | Ajoute l’onglet **Réserver** et autorise une réservation.                   |
| `meeting.order_services`           | Permet d’ajouter packages/services à la réservation.                        |
| `meeting.manage`                   | Autorise les opérations de gestion de réunions prévues pour le rôle client. |
| `notification.view`                | Donne accès aux notifications.                                              |
| `profile.manage` ou `profile.edit` | Permet les fonctions de profil autorisées.                                  |

### Contraintes qui s’ajoutent aux permissions

Même avec `order.create`, un produit ne peut pas être commandé si :

- il est inactif ou indisponible ;
- il n’est pas autorisé dans la branche ou pour le rôle ;
- son stock de branche est insuffisant ;
- le quota serait dépassé ;
- la société, branche ou le compte est inactif.

Même avec `meeting.book`, une salle n’apparaît pas si elle n’est pas autorisée au rôle, est inactive, trop petite ou indisponible au créneau.

---

## 30. Impact détaillé des permissions dans Tarhib Operations

| Permission(s)                                                                                              | Module/capacité mobile                                                                                               |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `operations.dashboard.view`, `operations.branch.supervise`, `operations.global.supervise` ou `report.view` | Tableau de bord Operations.                                                                                          |
| `company.manage` ou `operations.global.supervise`                                                          | Sélection globale société/branche.                                                                                   |
| `branch.manage`, `operations.branch.supervise` ou personnel Tarhib standard                                | Portée branche.                                                                                                      |
| `order.queue.view` ou `order.queue.manage`                                                                 | Voir la file de commandes.                                                                                           |
| `order.queue.manage`                                                                                       | Supervision de file, livraison et incidents selon écrans ; ne remplace pas toujours les droits de transition dédiés. |
| `order.prepare`                                                                                            | Module Cuisine ; démarrer préparation et marquer prête.                                                              |
| `order.deliver`                                                                                            | Module Livraison ; marquer livrée.                                                                                   |
| `order.stockout.report` ou `order.prepare`                                                                 | Signaler une rupture pendant la préparation.                                                                         |
| `stock.kitchen.view` ou `inventory.manage`                                                                 | Voir le stock cuisine.                                                                                               |
| `stock.kitchen.request` ou `order.prepare`                                                                 | Demander un réapprovisionnement cuisine.                                                                             |
| `stock.view` ou `inventory.manage`                                                                         | Voir le module Stock.                                                                                                |
| `stock.manage` ou `inventory.manage`                                                                       | Ajuster/gérer le stock.                                                                                              |
| `stock.transfer` ou `inventory.manage`                                                                     | Transferts et demandes associées.                                                                                    |
| `vip.view` ou `vip.manage`                                                                                 | Voir le module VIP.                                                                                                  |
| `vip.manage`                                                                                               | Gérer le VIP ; les droits granulaires précisent lieux/tâches.                                                        |
| `vip.location.view`                                                                                        | Voir les emplacements VIP.                                                                                           |
| `vip.location.manage`                                                                                      | Créer/modifier les emplacements.                                                                                     |
| `vip.task.view`                                                                                            | Voir les tâches VIP.                                                                                                 |
| `vip.task.complete`                                                                                        | Terminer une tâche VIP.                                                                                              |
| `meeting.preparation.view`, `.execute` ou `.manage`                                                        | Afficher le module Préparations de réunions.                                                                         |
| `meeting.preparation.execute`                                                                              | Exécuter les étapes affectées.                                                                                       |
| `meeting.preparation.manage`                                                                               | Superviser/affecter les préparations.                                                                                |
| `cleaning.task.view` ou `.manage`                                                                          | Afficher les tâches de nettoyage.                                                                                    |
| `cleaning.task.assign` ou `.manage`                                                                        | Affecter une tâche.                                                                                                  |
| `cleaning.task.complete` ou `.manage`                                                                      | Terminer une tâche.                                                                                                  |
| `cleaning.product.view` ou `.manage`                                                                       | Voir les consommables de nettoyage.                                                                                  |
| `cleaning.product.manage`                                                                                  | Administrer les consommables.                                                                                        |
| `cleaning.product.request`                                                                                 | Demander un réapprovisionnement.                                                                                     |
| `procurement.view` ou `.manage`                                                                            | Afficher les achats.                                                                                                 |
| `procurement.manage`                                                                                       | Capacité générale de gestion.                                                                                        |
| `procurement.create`                                                                                       | Créer un bon de commande.                                                                                            |
| `procurement.edit_draft`                                                                                   | Modifier un brouillon.                                                                                               |
| `procurement.submit`                                                                                       | Soumettre à validation.                                                                                              |
| `procurement.validate` ou `.manage`                                                                        | Valider.                                                                                                             |
| `procurement.reject` ou `.manage`                                                                          | Rejeter avec motif.                                                                                                  |
| `procurement.send`                                                                                         | Marquer envoyé.                                                                                                      |
| `procurement.cancel`                                                                                       | Annuler.                                                                                                             |
| `procurement.receive`                                                                                      | Enregistrer une réception.                                                                                           |
| `procurement.cost.view`                                                                                    | Voir les coûts/prix.                                                                                                 |
| `alert.view`, `inventory.manage` ou `report.view`                                                          | Voir les alertes.                                                                                                    |

Les onglets Operations sont construits dynamiquement. Un agent ne voit donc que ses modules. Les boutons de transition sont également filtrés : un Cuisinier ne voit pas **Livrée**, un Livreur ne voit pas **Démarrer la préparation**.

---

## 31. Accès par rôle interne par défaut

Les rôles sont modifiables : cette matrice décrit les valeurs initiales livrées par le seeder. Toujours vérifier la fiche du rôle en production.

### Directeur général

- pilotage et rapports globaux ;
- sociétés/branches, finance et comptabilité ;
- achats complets, coûts et validation ;
- stock complet, transferts et VIP ;
- préparations de réunions ;
- RH congés/contrats/évaluations ;
- impersonation employé ;
- portée globale.

Remarque : dans la configuration actuelle, certaines fonctions de gestion des rôles/employés ne figurent pas dans le seeder du Directeur général alors qu’elles figurent chez le Sous-directeur. Il faut vérifier/ajouter `role.manage` et `employee.manage` si ce rôle doit administrer ces écrans.

### Sous-directeur

- sociétés, branches, employés et rôles ;
- rapports ;
- finance et comptabilité complètes ;
- RH congés, contrats, évaluations ;
- gestion des produits et tâches de nettoyage ;
- consultation des coûts achats.

### Directeur de branche

- employés ;
- rapports de son périmètre ;
- file de commandes ;
- inventaire et VIP ;
- nettoyage ;
- approbation des congés.

Il ne reçoit pas `branch.manage` par défaut dans le seeder actuel ; l’accès Web aux pages Branches/Salles exige donc une permission additionnelle si souhaité.

### Superviseur

- gestion de la file ;
- préparation et livraison ;
- inventaire et VIP.

### Cuisinier

- consulter la file ;
- démarrer la préparation ;
- marquer prête ;
- signaler une rupture ;
- voir le stock cuisine ;
- demander son réapprovisionnement.

### Livreur

- consulter la file/livraison ;
- marquer une commande livrée.

### Manager hospitalité et nettoyage

- tableau de bord et supervision de branche ;
- file de commandes ;
- gestion/affectation du nettoyage ;
- consultation des produits de nettoyage ;
- supervision des préparations de réunions ;
- consultation du stock et rapports.

### Agent d’hospitalité

- voir et exécuter les préparations de réunions ;
- voir le stock cuisine ;
- demander un réapprovisionnement.

### Responsable stock

- stock complet, création, modification et ajustement ;
- transferts ;
- VIP ;
- consultation achats et réception des bons.

### Responsable achats

- consulter, créer, modifier, soumettre, envoyer et annuler les bons ;
- voir les coûts ;
- consulter le stock.

La validation/rejet et la réception ne sont pas inclus par défaut, ce qui assure une séparation des tâches.

### Agent de réapprovisionnement VIP

- voir les emplacements ;
- voir et terminer les tâches VIP.

### Agent de nettoyage

- voir et terminer ses tâches ;
- consulter les produits de nettoyage ;
- demander un réapprovisionnement.

---

## 32. Rôles clients recommandés

Les rôles clients sont propres à chaque société. Exemples de configuration :

| Rôle                     | Accès Employee                                | Configuration suggérée                                               |
| ------------------------ | --------------------------------------------- | -------------------------------------------------------------------- |
| Employé standard         | Catalogue, panier, commandes, quotas, profil  | SLA standard, quotas standards, salles désactivées ou sélectionnées. |
| Manager de département   | Même socle + salles/services selon besoin     | SLA supérieur, quotas élargis, salles de son périmètre.              |
| Direction/VIP            | Catalogue, commandes prioritaires, salles VIP | SLA élevé, produits/quotas dédiés, salles sélectionnées.             |
| Employé sans réservation | Catalogue et commandes uniquement             | Ne pas activer `meeting.book`.                                       |

Les permissions mobiles de base d’un compte client sont ajoutées automatiquement. Les limitations effectives reposent surtout sur le rôle, les quotas, les produits, les salles, la société et la branche.

---

## 33. Scénarios administratifs complets

### 33.1 Intégrer une nouvelle société cliente

1. Créer la société.
2. Créer ses branches et départements.
3. Créer/configurer ses niveaux SLA.
4. Créer les rôles clients.
5. Affecter quotas, produits et salles aux rôles.
6. Créer les salles et packages.
7. Configurer produits disponibles et stock initial.
8. Inviter les employés.
9. Tester avec un compte pilote.
10. Vérifier commande, quota, suivi et réservation de bout en bout.

### 33.2 Intégrer un nouvel agent Tarhib

1. Créer/inviter l’employé interne.
2. Affecter sa branche.
3. Choisir le rôle principal.
4. Ajouter uniquement les rôles additionnels nécessaires.
5. Tester le profil d’accès.
6. Vérifier les onglets dans Tarhib Operations et une action autorisée.

### 33.3 Traiter une commande

1. L’employé commande dans Tarhib Employee.
2. Le manager approuve ou rejette si le flux l’exige.
3. Le cuisinier démarre puis marque prête.
4. Le livreur marque livrée ou signale un incident.
5. L’employé suit chaque étape en temps réel.
6. Les quotas, stocks, rapports et audit sont mis à jour.

### 33.4 Réapprovisionner le stock

1. Une alerte de seuil apparaît.
2. L’agent crée une demande ou le responsable crée un transfert/bon d’achat.
3. Le transfert est confirmé ou le bon est reçu.
4. Le stock destination augmente.
5. La disponibilité catalogue est recalculée.
6. L’historique et les rapports enregistrent le mouvement.

---

## 34. Diagnostic des problèmes d’accès

### Le menu n’apparaît pas

1. Vérifier le statut actif de l’utilisateur.
2. Vérifier son rôle principal et ses rôles additionnels.
3. Comparer la permission avec la matrice de ce guide.
4. Vérifier la portée société/branche.
5. Actualiser le profil ou se reconnecter.
6. Contrôler que le module Web n’exige pas encore une permission agrégée.

### Le menu apparaît mais l’action échoue

- vérifier la permission d’action granulaire ;
- vérifier le statut courant de l’objet ;
- vérifier société/branche ;
- vérifier stock, quota ou période comptable ;
- relever le message serveur et consulter le journal d’audit.

### Un module mobile manque

- contrôler les permissions et capacités calculées dans le profil d’accès ;
- vérifier le scope CLIENT/TARHIB ;
- fermer puis rouvrir l’application ou se reconnecter ;
- pour Employee, vérifier spécialement `meeting.book` ;
- pour Operations, vérifier la permission du module, pas uniquement le titre du rôle.

### Un utilisateur voit trop de données

Retirer en priorité les permissions globales `company.manage` et `operations.global.supervise`, puis contrôler son affectation société/branche et ses rôles additionnels.

---

## 35. Règles de sécurité et de gouvernance

- appliquer le moindre privilège ;
- séparer création, validation et réception des achats ;
- réserver les coûts, salaires, finance et comptabilité aux fonctions concernées ;
- utiliser les rôles additionnels pour un besoin limité, puis les retirer ;
- tester tout rôle sensible avant attribution ;
- préférer désactivation à suppression pour préserver l’historique ;
- ne jamais partager un compte ;
- vérifier périodiquement les rôles, employés inactifs et permissions globales ;
- documenter les ajustements de stock et corrections financières ;
- consulter l’audit lors de toute anomalie.

---

## 36. Checklist de recette après changement de permissions

- [ ] Le menu Web attendu apparaît/disparaît.
- [ ] Une URL interdite est refusée.
- [ ] Les sélecteurs société/branche respectent la portée.
- [ ] Une action autorisée aboutit.
- [ ] Une action non autorisée est absente ou refusée.
- [ ] Tarhib Employee affiche uniquement catalogue/salles/actions prévues.
- [ ] Tarhib Operations affiche uniquement les modules prévus.
- [ ] Les boutons de transition de commande correspondent au métier.
- [ ] Les coûts, salaires et données financières restent protégés.
- [ ] Les changements sont visibles après reconnexion.
- [ ] L’audit contient les opérations sensibles.

---

## 37. Notes d’implémentation importantes

1. Le Web Admin protège plusieurs groupes par permissions agrégées, tandis que Tarhib Operations utilise davantage les permissions granulaires Operations 2.0.
2. Les pages **Commandes** et **Quotas** sont présentes pour tout utilisateur Web authentifié dans le routeur actuel ; le backend doit donc rester le contrôle d’autorité pour les données et mutations.
3. La permission `meeting.order_services` est utilisée comme compatibilité dans certains calculs mobiles, mais les permissions `meeting.preparation.*` sont les droits internes précis à privilégier.
4. Les comptes clients reçoivent un socle de permissions automatiquement ; modifier seulement la liste visible d’un rôle client ne retire pas ce socle.
5. Les rôles système par défaut sont resynchronisés par le seeder au démarrage. Toute personnalisation de ces rôles doit être coordonnée avec la stratégie de déploiement afin d’éviter son écrasement.

---

## 38. Référence rapide des statuts

### Commande

`PENDING` → `APPROVED` → `IN_PROGRESS` → `READY` → `DELIVERED`  
Sorties possibles : `REJECTED`, `CANCELLED`.

### Transfert

`PENDING` → `CONFIRMED` ou `CANCELLED`.

### Bon de commande

`DRAFT` → `PENDING_VALIDATION` → `VALIDATED` → `SENT` → `PARTIALLY_RECEIVED` → `RECEIVED`  
Sorties possibles : `REJECTED`, `CANCELLED`.

### Congé

`PENDING` → `APPROVED` ou `REJECTED`.

### Évaluation

`DRAFT` → `FINALIZED`.

### Écriture comptable

`DRAFT` → `POSTED`.

### Tâche VIP

`OPEN` → `IN_PROGRESS` → `COMPLETED`.

---

## 39. Cas pratiques détaillés par module

Les exemples suivants utilisent des données fictives. Adapter les sociétés, branches, produits, montants et comptes au contexte réel. Les intitulés exacts de certains champs peuvent varier selon la langue de l’interface.

### 39.1 Tableau de bord — analyser une hausse des commandes en attente

**Situation :** le manager voit 42 commandes en attente contre 18 sur la période précédente.

**Prérequis :** accès au Web Admin et périmètre couvrant la branche concernée.

**Procédure :**

1. Ouvrir **Tableau de bord**.
2. Choisir la société **Al Noor Holding** et la branche **Siège Riyad**.
3. Comparer la carte **Commandes en attente** à la période précédente.
4. Examiner la répartition par statut pour déterminer si le blocage se situe en `PENDING`, `APPROVED` ou `IN_PROGRESS`.
5. Cliquer sur **Voir les commandes**.
6. Dans **Commandes**, appliquer le statut correspondant.
7. Trier mentalement/prioriser selon le SLA affiché et ouvrir les commandes les plus anciennes.

**Résultat attendu :** le manager identifie si le retard vient de l’approbation, de la cuisine ou de la livraison et affecte l’action à l’équipe compétente.

**Contrôle :** après traitement, les compteurs diminuent lors du rafraîchissement ou de la mise à jour temps réel.

---

### 39.2 Rôles — créer un rôle « Chef de cuisine »

**Objectif :** autoriser la préparation et la consultation du stock cuisine sans donner accès aux finances ni au stock central.

**Procédure :**

1. Ouvrir **Rôles et permissions** > onglet **Tarhib**.
2. Sélectionner **Créer un rôle**.
3. Saisir :
   - nom arabe : `رئيس المطبخ` ;
   - nom anglais : `Kitchen Lead`.
4. Sélectionner uniquement :
   - `order.queue.view` ;
   - `order.prepare` ;
   - `order.stockout.report` ;
   - `stock.kitchen.view` ;
   - `stock.kitchen.request` ;
   - `profile.edit`.
5. Enregistrer.
6. Avec `role.impersonate`, sélectionner **Tester ce rôle**.
7. Vérifier que les modules Cuisine/stock cuisine sont présents et que Finance, RH et administration sont absents.

**Résultat attendu :** le Chef de cuisine peut démarrer une commande, la marquer prête, signaler une rupture et demander un réapprovisionnement, sans pouvoir effectuer un transfert de stock.

### 39.3 Rôles — créer un rôle client « Direction VIP »

**Objectif :** proposer des produits premium, des quotas élevés et seulement deux salles de direction.

**Procédure :**

1. Ouvrir l’onglet **Client** et choisir **Al Noor Holding**.
2. Créer le rôle `Direction VIP`.
3. Choisir le niveau SLA `P1 — Direction`.
4. Activer la réservation de salles.
5. Choisir **Salles sélectionnées**, puis **Majlis Direction** et **Board Room 12F**.
6. Ajouter les quotas :
   - Café premium : 6/jour ;
   - Plateau exécutif : 2/jour ;
   - Déjeuner direction : 10/mois.
7. Enregistrer et affecter le rôle à un utilisateur pilote.
8. Se connecter à Tarhib Employee avec ce pilote.

**Résultat attendu :** l’utilisateur voit l’onglet Réserver, uniquement les deux salles autorisées, et les quotas VIP sur les produits concernés.

### 39.4 Rôles — donner temporairement un droit additionnel

**Situation :** le Responsable achats remplace le valideur pendant trois jours.

1. Créer un petit rôle additionnel `Validation achats temporaire` contenant seulement `procurement.validate` et `procurement.reject`.
2. L’affecter comme rôle additionnel au responsable.
3. Lui demander de se reconnecter et de tester une validation.
4. À la fin du remplacement, retirer le rôle additionnel.
5. Vérifier dans l’audit les validations réalisées pendant la période.

**Bonne pratique :** ne pas modifier durablement le rôle système Responsable achats pour un remplacement ponctuel.

---

### 39.5 Sociétés — intégrer une nouvelle entreprise cliente

**Exemple :** société **Namaa Consulting**.

1. Ouvrir **Sociétés** > **Ajouter**.
2. Saisir `نماء للاستشارات` et `Namaa Consulting`.
3. Activer la société puis enregistrer.
4. Créer ensuite ses branches, départements, niveaux SLA et rôles clients.
5. Ne pas inviter les employés avant d’avoir configuré catalogue, stock, quotas et salles.

**Résultat attendu :** Namaa devient un tenant sélectionnable, sans accès aux données d’une autre société.

### 39.6 Sociétés — suspendre un client sans perdre l’historique

1. Rechercher **Namaa Consulting**.
2. Ouvrir **Modifier**.
3. Désactiver l’état actif.
4. Enregistrer.

**Résultat attendu :** les données historiques restent disponibles pour les administrateurs autorisés, mais la société ne doit plus produire de nouvelles opérations. Ne pas utiliser **Supprimer** pour une société ayant déjà des commandes.

---

### 39.7 Branches — ouvrir un nouveau site

1. Ouvrir **Branches** et filtrer sur **Namaa Consulting**.
2. Créer `فرع العليا / Olaya Branch`.
3. Renseigner l’adresse et le responsable proposés dans le formulaire.
4. Activer la branche.
5. Créer ses départements, son stock initial et ses salles.
6. Affecter les agents Tarhib à cette branche.

**Contrôle :** dans Tarhib Operations, un agent de la branche ne doit voir que les commandes et stocks d’Olaya, sauf droit global.

---

### 39.8 Départements — structurer le client

**Exemple :** créer les départements Finance et Direction.

1. Sélectionner la société **Namaa Consulting** puis **Olaya Branch**.
2. Créer `المالية / Finance` et l’activer.
3. Recommencer pour `الإدارة / Executive Office`.
4. Affecter les employés au bon département depuis leur fiche.

**Résultat attendu :** les filtres d’employés et les affectations VIP/réunions peuvent utiliser cette structure.

---

### 39.9 Employés clients — créer un employé standard

1. Ouvrir **Employés clients** > **Ajouter**.
2. Saisir identité bilingue, `sara.hassan@namaa.example` et téléphone.
3. Choisir Namaa > Olaya > Finance.
4. Affecter le rôle principal `Employé standard`.
5. Enregistrer.
6. Vérifier que le compte est actif et que l’adresse e-mail est unique.

**Test :** se connecter à Employee ; Sara doit voir le catalogue Namaa, ses quotas et aucune salle si `meeting.book` n’est pas activée.

### 39.10 Employés clients — faire évoluer une employée vers un rôle VIP

1. Rechercher Sara et ouvrir sa fiche.
2. Remplacer le rôle principal par `Direction VIP`, ou l’ajouter en rôle additionnel si le cumul est intentionnel.
3. Enregistrer et faire reconnecter l’utilisatrice.
4. Vérifier les nouveaux quotas et les deux salles VIP.

**Attention :** avec un rôle additionnel, Sara conserve aussi tous les droits de son rôle principal.

---

### 39.11 Employés internes — affecter un cuisinier

1. Ouvrir **Employés internes** > **Ajouter**.
2. Saisir les informations de l’agent.
3. Affecter la branche **Olaya Branch**.
4. Choisir le rôle principal **Cook/Cuisinier**.
5. Enregistrer.
6. Se connecter à Tarhib Operations.

**Résultat attendu :** l’agent voit Cuisine, peut passer `APPROVED` à `IN_PROGRESS`, puis `READY`, mais ne peut pas marquer la commande livrée.

### 39.12 Employés internes — accorder la consultation de rapports à un manager

1. Créer ou réutiliser un rôle contenant uniquement `report.view`.
2. L’ajouter comme rôle additionnel au manager.
3. Vérifier l’apparition du module Rapports et du tableau de bord Operations.
4. Vérifier que le manager ne peut toujours pas modifier la comptabilité ou la finance.

---

### 39.13 Inscriptions — approuver une demande

1. Ouvrir **Inscriptions** > **Demandes en attente**.
2. Identifier `sara.hassan@namaa.example`.
3. Cliquer sur **Approuver**.
4. Choisir Olaya, Finance et Employé standard.
5. Confirmer.

**Résultat attendu :** la demande quitte la liste d’attente et une fiche employé active est créée. Une affectation incorrecte peut exposer le mauvais catalogue ; contrôler société et branche avant validation.

### 39.14 Invitations — inviter dix employés d’un même département

Répéter le formulaire pour chaque adresse ou utiliser la fonctionnalité d’import si elle est ajoutée ultérieurement. Pour chaque invitation : choisir la même société/branche/département et le rôle standard. Après envoi, suivre les comptes non finalisés et relancer via le canal prévu par l’organisation.

---

### 39.15 Produits — créer un produit simple

**Exemple :** Eau minérale 330 ml.

1. Ouvrir **Produits** > **Ajouter**.
2. Renseigner :
   - arabe : `مياه معدنية ٣٣٠ مل` ;
   - anglais : `Mineral Water 330 ml` ;
   - catégorie : Boissons froides ;
   - unité de service : pièce/bouteille ;
   - actif et disponible : oui.
3. Ajouter une image optimisée.
4. Renseigner les informations nutritionnelles si nécessaires.
5. Autoriser les branches Olaya et Siège Riyad.
6. Enregistrer.
7. Créer le stock initial dans chaque branche.

**Résultat attendu :** le produit apparaît dans Employee uniquement dans les branches autorisées et s’il possède du stock disponible.

### 39.16 Produits — créer un produit avec allergènes

**Exemple :** Cappuccino lait entier.

1. Créer `كابتشينو / Cappuccino`.
2. Ajouter la description bilingue.
3. Déclarer l’allergène **Lait**.
4. Ajouter calories, protéines, glucides et lipides selon les informations validées.
5. Limiter le produit aux rôles qui doivent y accéder si nécessaire.
6. Enregistrer puis vérifier la fiche dans Employee en arabe et en anglais.

**Contrôle :** l’allergène doit être lisible avant l’ajout au panier. Une traduction vide ne doit pas être compensée par une information inventée.

### 39.17 Produits — construire une recette technique

**Exemple :** un Cappuccino consomme 1 capsule, 200 ml de lait et 8 g de sucre.

**Préparation :** créer d’abord trois produits ingrédients : Capsule espresso, Lait entier et Sucre. Leur unité d’achat/stock doit permettre les conversions métier attendues.

1. Ouvrir le détail du produit Cappuccino.
2. Ouvrir la section **Recette**.
3. Ajouter :
   - Capsule espresso : `1` unité ;
   - Lait entier : `0,2` litre si l’unité de stock est le litre, ou `200` si elle est le millilitre ;
   - Sucre : `0,008` kg si l’unité est le kilogramme, ou `8` si elle est le gramme.
4. Enregistrer chaque ligne.
5. Passer une commande test de deux Cappuccinos.
6. Vérifier que la réservation/consommation attendue est de 2 capsules, 0,4 L de lait et 16 g de sucre.

**Erreur fréquente :** saisir `200` lorsque l’unité de stock est le litre entraînerait une consommation aberrante. Toujours vérifier l’unité avant la quantité.

### 39.18 Produits — limiter un produit à une branche

**Situation :** le Plateau exécutif n’est préparé qu’au Siège Riyad.

1. Modifier le produit.
2. Dans les branches autorisées, sélectionner uniquement **Siège Riyad**.
3. Enregistrer.
4. Tester avec un compte Employee de Riyad puis avec un compte d’Olaya.

**Résultat attendu :** visible/commandable à Riyad, absent ou non disponible à Olaya, indépendamment du stock d’une autre branche.

### 39.19 Produits — retirer temporairement un produit

Pour une rupture fournisseur prolongée, désactiver le produit ou sa disponibilité au lieu de le supprimer. Les anciennes commandes conservent ainsi leurs lignes et libellés historiques. Réactiver après réapprovisionnement et contrôle du stock.

---

### 39.20 Commandes — traiter une commande normale

**Exemple :** commande #A102, deux cafés et une eau.

1. Le manager ouvre la commande `PENDING` et vérifie client, lignes, note et quota.
2. Il sélectionne **Approuver** : statut `APPROVED`.
3. Le cuisinier la voit dans Operations et choisit **Démarrer** : `IN_PROGRESS`.
4. Après préparation, il choisit **Prête** : `READY`.
5. Le livreur contrôle le destinataire puis choisit **Livrée** : `DELIVERED`.

**Résultat attendu :** chaque horodatage est visible dans la chronologie et l’employé reçoit les mises à jour.

### 39.21 Commandes — rejeter avec un motif exploitable

1. Ouvrir une commande `PENDING` contenant un service impossible.
2. Choisir **Rejeter**.
3. Saisir : `Machine à café du 12e étage indisponible jusqu’à 14 h. Merci de recommander après 14 h.`
4. Confirmer.

**Résultat attendu :** statut `REJECTED`, motif visible dans Mes commandes, quota/restock restauré selon les règles. Éviter un motif vague comme « impossible ».

### 39.22 Commandes — signaler une rupture pendant la préparation

1. Le cuisinier ouvre une commande approuvée.
2. Constate que le lait physique est insuffisant malgré le stock système.
3. Sélectionne **Signaler une rupture** et choisit le produit concerné.
4. Ajoute un commentaire précis.
5. Le responsable stock réalise ensuite un inventaire et un ajustement motivé.

**Résultat attendu :** l’incident est visible, le produit peut devenir indisponible et l’écart est corrigé sans falsifier l’historique.

---

### 39.23 Quotas — configurer un quota journalier individuel

**Objectif :** limiter Sara à trois cafés par jour.

1. Ouvrir **Quotas** > **Ajouter**.
2. Choisir Namaa, Sara Hassan et Cappuccino.
3. Quantité : `3`.
4. Période : `DAILY`.
5. Enregistrer.
6. Passer une commande de deux unités puis actualiser le quota.

**Résultat attendu :** consommation 2/3, restant 1. Une tentative ultérieure de deux unités est bloquée.

### 39.24 Quotas — quota mensuel porté par un rôle

1. Modifier le rôle Direction VIP.
2. Ajouter Déjeuner direction, quantité `10`, période `MONTHLY`.
3. Enregistrer.
4. Vérifier avec deux employés portant ce rôle.

**Point de contrôle :** déterminer avec le métier si la limite est individuelle par porteur du rôle ou partagée ; le comportement implémenté doit être testé avant généralisation.

### 39.25 Quotas — corriger une limite mal saisie

Si un quota de 30/mois a été créé par erreur à 3/mois, modifier la quantité. Ne pas supprimer puis recréer pendant qu’une commande est en cours sans contrôler la consommation déjà enregistrée.

---

### 39.26 Salles — créer et réserver une salle

**Administration :**

1. Créer `قاعة النخيل / Palm Room` dans Olaya.
2. Capacité : 12.
3. Équipements : écran, visioconférence, tableau blanc.
4. Activer la salle.
5. L’autoriser au rôle Manager de département.

**Test Employee :**

1. Se connecter avec un manager possédant `meeting.book`.
2. Ouvrir **Réserver**.
3. Choisir demain, 10:00–11:00, 8 participants.
4. Choisir Palm Room et confirmer.

**Résultat attendu :** la réservation apparaît dans le détail Web de la salle et le créneau n’est plus proposé à un second utilisateur.

### 39.27 Salles — diagnostiquer une salle absente

Vérifier successivement : salle active, bonne société/branche, capacité suffisante, absence de conflit, autorisation dans le rôle, permission `meeting.book`. Cette séquence évite de modifier inutilement le stock ou les permissions générales.

---

### 39.28 Packages de réunion — créer un petit déjeuner

1. Ouvrir **Packages de services** > **Ajouter**.
2. Nom : `إفطار أعمال / Business Breakfast`.
3. Description : café, thé, eau, mini-viennoiseries et service.
4. Saisir le prix validé et activer.
5. Rattacher à la société concernée.
6. Tester une réservation avec `meeting.order_services`.

**Résultat attendu :** le package est sélectionnable et ses informations sont intégrées à la préparation de réunion.

---

### 39.29 Stock — créer un stock initial

**Exemple :** 240 bouteilles d’eau à Olaya, entrepôt de branche.

1. Ouvrir **Stock** et choisir Namaa > Olaya > Entrepôt branche.
2. Sélectionner **Nouvelle entrée**.
3. Produit : Eau minérale 330 ml.
4. Quantité initiale : `240`.
5. Seuil minimum : `48` ; maximum : `300`.
6. Motif/référence : `Stock initial ouverture Olaya — inventaire validé 07/08/2026`.
7. Enregistrer.

**Résultat attendu :** quantité 240, statut normal, produit disponible dans Employee si toutes les autres règles le permettent.

### 39.30 Stock — enregistrer une sortie réelle

**Situation :** 12 bouteilles ont été utilisées pour un événement hors commande.

1. Ouvrir la ligne Eau/Olaya/Entrepôt branche.
2. Choisir l’action de sortie ou ajustement négatif appropriée.
3. Saisir quantité `12`.
4. Motif : `Événement comité exécutif — réservation MR-2026-0812`.
5. Confirmer.

**Résultat attendu :** stock 228 et mouvement négatif historisé. Ne pas modifier directement la quantité finale sans motif.

### 39.31 Stock — corriger un écart d’inventaire

**Situation :** le système indique 100 capsules, le comptage physique en trouve 94.

1. Recompter avec une seconde personne.
2. Ouvrir l’article puis **Ajuster**.
3. Saisir la correction `-6` ou la quantité finale selon le formulaire.
4. Motif : `Écart inventaire hebdomadaire — comptage physique 94, système 100`.
5. Enregistrer.
6. Consulter l’historique et, si l’écart se répète, rechercher les consommations non enregistrées.

**Résultat attendu :** quantité 94, trace d’ajustement complète.

### 39.32 Stock — gérer un seuil bas

**Exemple :** stock de lait = 8 L, minimum = 10 L, maximum = 40 L.

1. L’alerte stock bas apparaît dans Operations.
2. Calculer la demande recommandée : 40 − 8 = 32 L.
3. Créer une demande de réapprovisionnement cuisine ou un transfert depuis l’entrepôt branche.
4. Après confirmation du transfert, vérifier que le stock cuisine augmente et le stock source diminue.

### 39.33 Stock — comprendre les réservations

Lorsqu’une commande est validée, une partie du stock peut être réservée avant consommation définitive. Ainsi, `quantité physique = 20` ne signifie pas nécessairement `20 disponibles`. Avant un ajustement important, vérifier les commandes actives et réservations afin d’éviter de rendre commandable un stock déjà engagé.

---

### 39.34 Transferts — déplacer du stock de l’entrepôt vers la cuisine

**Exemple :** transférer 30 L de lait.

1. Ouvrir **Transferts** > **Créer**.
2. Société : Namaa ; branche : Olaya.
3. Source : Entrepôt branche ; destination : Cuisine.
4. Produit : Lait entier ; quantité : `30` L.
5. Enregistrer : transfert `PENDING`.
6. Une seconde personne autorisée vérifie source, destination et quantité.
7. Sélectionner **Confirmer**.

**Résultat attendu :** −30 L source, +30 L destination, statut `CONFIRMED` et historique horodaté.

### 39.35 Transferts — annuler une erreur avant confirmation

Si la destination a été saisie comme Entrepôt central au lieu de Cuisine, ouvrir le transfert `PENDING` et choisir **Annuler**. Créer ensuite un nouveau transfert correct. Ne jamais confirmer pour « corriger plus tard », car cela produit deux mouvements inutiles.

---

### 39.36 Fournisseurs — configurer un fournisseur et ses prix

1. Créer **Gulf Dairy Supply** avec coordonnées et statut actif.
2. Ouvrir **Prix produits**.
3. Ajouter Lait entier : prix `72 SAR` par carton de 12 litres.
4. Ajouter Sucre : `95 SAR` par sac de 25 kg.
5. Enregistrer.

**Contrôle technique :** vérifier que l’unité d’achat du produit correspond au conditionnement. Le prix de carton ne doit pas être interprété comme prix au litre.

### 39.37 Fournisseurs — mettre à jour un tarif sans perdre l’historique

Modifier le tarif fournisseur pour les futurs bons. Les bons déjà créés doivent conserver leur prix de ligne historique. Vérifier ce point sur un ancien bon avant de déployer une mise à jour massive.

---

### 39.38 Achats — cycle complet d’un bon de commande

**Exemple :** acheter 20 cartons de lait à 72 SAR.

1. Le Responsable achats crée un bon pour Gulf Dairy Supply, livraison Olaya.
2. Il ajoute Lait entier, 20 cartons, 72 SAR/carton ; total attendu 1 440 SAR hors taxes/frais.
3. Il enregistre le brouillon et vérifie unités, montant et adresse.
4. Il sélectionne **Soumettre**.
5. Un valideur distinct contrôle le budget et sélectionne **Valider**.
6. Le Responsable achats sélectionne **Envoyer**.
7. À la livraison, le Responsable stock ouvre **Recevoir**.
8. Il saisit 18 cartons réellement reçus : statut `PARTIALLY_RECEIVED`.
9. Lors de la seconde livraison, il saisit les 2 cartons restants : `RECEIVED`.

**Résultat attendu :** le stock augmente en deux réceptions, le bon conserve les quantités commandées/reçues et le coût alimente les rapports.

### 39.39 Achats — rejeter un bon

1. Ouvrir un bon `PENDING_VALIDATION`.
2. Constater un prix supérieur au contrat.
3. Sélectionner **Rejeter**.
4. Motif : `Prix contractuel attendu : 68 SAR/carton ; bon soumis à 72 SAR. Merci de corriger ou joindre l’avenant.`

**Résultat attendu :** statut `REJECTED`, aucun stock reçu et motif exploitable par l’acheteur.

### 39.40 Achats — réception avec produit endommagé

Pour 20 cartons livrés dont 2 endommagés, réceptionner uniquement la quantité réellement acceptée, par exemple 18. Documenter l’écart dans le processus fournisseur. Ne pas réceptionner 20 puis créer une sortie de 2, sauf si la politique comptable impose explicitement cette méthode.

---

### 39.41 VIP — créer et approvisionner un emplacement

1. Ouvrir **Libre-service VIP** > **Créer un emplacement**.
2. Choisir Namaa, Olaya, département Direction.
3. Nommer `Executive Lounge 12F` et affecter un agent VIP.
4. Ajouter Eau, quantité cible 24, seuil 6.
5. Ajouter Café premium, quantité cible 20, seuil 5.
6. Quand l’eau passe à 5, ouvrir la tâche générée.
7. Choisir Entrepôt branche comme source et terminer le réapprovisionnement.

**Résultat attendu :** le stock source diminue, l’emplacement revient à sa cible et la tâche passe à `COMPLETED`.

---

### 39.42 Rapports — analyser le respect du SLA

1. Ouvrir **Rapports** > **Commandes**.
2. Choisir le mois précédent, Namaa et Olaya.
3. Examiner volumes par statut et rapport SLA.
4. Comparer P1/P2/P3 si disponibles.
5. Repérer les commandes livrées après échéance.
6. Croiser avec heures, produits et étapes de préparation.

**Exemple de conclusion :** « 78 % des retards P2 surviennent entre 12 h et 13 h 30 ; la préparation représente 70 % du délai. » Cette conclusion justifie un ajustement d’équipe plutôt qu’un changement arbitraire de SLA.

### 39.43 Rapports — analyser les quotas

1. Ouvrir l’onglet **Quotas**.
2. Filtrer sur Direction VIP et les 30 derniers jours.
3. Repérer les taux supérieurs à 80 %.
4. Vérifier si la hausse concerne un produit ou quelques employés.
5. Avant d’augmenter un quota, comparer consommation, coût et ruptures.

### 39.44 Rapports — analyser les achats

Filtrer par fournisseur Gulf Dairy et produit Lait entier. Comparer quantités, prix et périodes. Une hausse de coût sans hausse de volume doit être rapprochée des changements de tarifs fournisseur et des bons concernés.

---

### 39.45 Audit — retrouver l’auteur d’un ajustement

1. Ouvrir **Audit**.
2. Choisir la période du 7 août 2026.
3. Filtrer sur entité Inventaire et action Mise à jour/Ajustement.
4. Rechercher l’article Lait entier ou son identifiant.
5. Ouvrir le détail avant/après.

**Résultat attendu :** identifier acteur, date, quantité précédente, nouvelle quantité et motif. Si le motif n’est pas présent, renforcer la procédure de saisie.

### 39.46 Audit — contrôler une modification de rôle sensible

Rechercher les actions sur le rôle Direction VIP. Vérifier qui a ajouté `meeting.book`, à quelle date et avec quelles salles. Comparer ensuite la date à la première réservation concernée.

---

### 39.47 Finance — créer un contrat commercial

1. Ouvrir **Finance > Contrats** > **Ajouter**.
2. Société : Namaa Consulting.
3. Référence : `CTR-NAMAA-2026-01`.
4. Période : 01/08/2026 au 31/07/2027.
5. Montant/conditions selon le contrat signé.
6. Enregistrer en `DRAFT` pendant la revue.
7. Après signature, modifier en `ACTIVE`.

**Contrôle :** dates cohérentes, société correcte, pas de doublon de référence, statut expiré correctement signalé après échéance.

### 39.48 Finance — enregistrer une dépense

**Exemple :** maintenance machine à café, 850 SAR.

1. Ouvrir **Finance > Dépenses** > **Ajouter**.
2. Date : 07/08/2026 ; catégorie : Maintenance.
3. Société/branche : Namaa/Olaya si le formulaire le prévoit.
4. Montant : `850 SAR`.
5. Référence : `INV-MAINT-8842`.
6. Description : `Remplacement pompe machine étage 12`.
7. Enregistrer.

**Résultat attendu :** la dépense apparaît dans la période d’août et dans la vue financière.

### 39.49 Finance — corriger une dépense après clôture

**Situation :** 850 SAR ont été enregistrés à 8 500 SAR et la période est clôturée.

1. Ne pas rouvrir/modifier silencieusement l’écriture sans validation métier.
2. Ouvrir la dépense et choisir **Corriger/contre-passer**.
3. Indiquer la valeur correcte et le motif : `Erreur de saisie décimale sur INV-MAINT-8842`.
4. Enregistrer la correction dans la période autorisée.

**Résultat attendu :** l’écriture originale reste traçable et la correction compense l’écart.

### 39.50 Finance — suivre une dette partiellement payée

Créer une dette fournisseur de 10 000 SAR, échéance 31/08. Après un règlement de 6 000 SAR, actualiser selon le processus disponible : restant 4 000, statut `PARTIALLY_PAID`. Après le solde, passer à `PAID`. Ne pas marquer `PAID` tant que le paiement bancaire n’est pas confirmé.

---

### 39.51 Comptabilité — créer un compte du plan comptable

**Exemple :** charge de consommables d’hospitalité.

1. Ouvrir **Comptabilité > Plan comptable** > **Ajouter**.
2. Code : `611200`.
3. Nom : `Hospitality consumables expense` / traduction validée.
4. Type : Charge.
5. Parent : compte de charges d’exploitation approprié.
6. Activer et enregistrer.

**Contrôle :** le code doit être unique et respecter le plan comptable adopté. Ne pas créer un compte simplement parce qu’un libellé existant est difficile à trouver.

### 39.52 Comptabilité — saisir une écriture équilibrée

**Situation :** facture de consommables de 1 440 SAR reçue à crédit.

1. Ouvrir **Écritures de journal** > **Ajouter**.
2. Date : date de facture ; référence : numéro du bon/facture.
3. Ligne 1 : débit compte `611200 — Consommables hospitalité`, 1 440 SAR.
4. Ligne 2 : crédit compte `Fournisseurs`, 1 440 SAR.
5. Ajouter une description reliant fournisseur et bon de commande.
6. Vérifier total débit 1 440 = total crédit 1 440.
7. Enregistrer en `DRAFT`.
8. Une personne autorisée revoit puis sélectionne **Valider/Poster**.

**Résultat attendu :** écriture `POSTED`, compte de charge débité et dette fournisseur créditée.

### 39.53 Comptabilité — exemple d’écriture déséquilibrée

Débit 1 440 et crédit 1 400 produit un écart de 40. Le bouton d’enregistrement/validation doit rester indisponible ou l’API doit refuser. Ne jamais ajouter une ligne « Divers 40 » sans justification ; retrouver l’erreur de taxe, prix ou saisie.

### 39.54 Comptabilité — enregistrer le paiement d’un fournisseur

1. Créer une écriture à la date du paiement.
2. Débiter le compte Fournisseurs de 1 440 SAR.
3. Créditer Banque de 1 440 SAR.
4. Référencer le paiement bancaire et la facture.
5. Valider après rapprochement.

**Effet :** la dette fournisseur diminue et le solde bancaire comptable diminue.

### 39.55 Comptabilité — contrôler la balance générale

1. Ouvrir **Rapports comptables > Balance générale**.
2. Choisir du 01/08 au 31/08.
3. Vérifier l’égalité totale débit/crédit.
4. Rechercher les soldes inhabituels ou comptes de passage non soldés.
5. Ouvrir le grand livre d’un compte problématique.

### 39.56 Comptabilité — lire le grand livre

Sélectionner le compte `611200` et août 2026. Vérifier chaque pièce, date, libellé, débit/crédit et solde progressif. Comparer le total aux factures d’achat et rechercher les doublons.

### 39.57 Comptabilité — clôturer un exercice

1. Vérifier que toutes les écritures attendues sont postées.
2. Contrôler balance, banque, fournisseurs et comptes de passage.
3. Sauvegarder/exporter les rapports exigés.
4. Sélectionner **Clôturer** et confirmer.
5. Tester qu’une nouvelle écriture sur la période est refusée.

**Attention :** la réouverture doit rester exceptionnelle, documentée et limitée à `accounting.manage`.

---

### 39.58 RH — approuver une demande de congé

1. Ouvrir **RH > Congés**.
2. Ouvrir une demande `PENDING` de 3 jours.
3. Vérifier type, dates, chevauchement et solde disponible.
4. Sélectionner **Approuver**.

**Résultat attendu :** statut `APPROVED`, solde mis à jour. Si le solde est insuffisant, rejeter avec un motif précis ou corriger le solde selon la politique RH.

### 39.59 RH — créer un type de congé

Dans l’onglet Types, créer `Congé exceptionnel`, définir le libellé, les règles/limites proposées et l’état actif. Tester ensuite la création d’une demande avec ce type.

### 39.60 RH — créer un contrat de travail

1. Ouvrir **Contrats RH** > **Ajouter**.
2. Choisir l’employé, date de début, date de fin éventuelle, fonction et conditions.
3. Statut `ACTIVE`.
4. Enregistrer.
5. Lors d’un renouvellement, conserver la traçabilité et utiliser `RENEWED` selon le processus métier.

### 39.61 RH — finaliser une évaluation

Créer l’évaluation en `DRAFT`, saisir période, objectifs, score et commentaire. Faire relire, puis passer à `FINALIZED`. Après finalisation, toute correction doit suivre la politique RH et ne pas supprimer l’historique.

### 39.62 RH — vérifier un bulletin de paie

1. Ouvrir **Bulletins** et choisir l’employé/période.
2. Vérifier salaire de base, indemnités, retenues, impôts et net.
3. Comparer à la configuration fiscale active.
4. En cas d’écart, corriger la source ou la configuration avant une nouvelle génération ; ne pas modifier arbitrairement le total final.

---

### 39.63 Profil — contrôler ses propres accès

1. Ouvrir **Profil**.
2. Vérifier rôle principal, rôles additionnels, société et branche.
3. Comparer les permissions aux tâches attendues.
4. Changer langue ou thème si souhaité.
5. Si une permission manque, demander au gestionnaire de rôle ; elle ne peut pas être ajoutée depuis le profil.

---

### 39.64 Tarhib Employee — parcours complet d’une commande

1. L’employé ouvre le catalogue et recherche `Cappuccino`.
2. Il vérifie allergène lait, disponibilité et quota restant 3.
3. Il ajoute 2 unités au panier.
4. Il ajoute la note `Sans sucre pour une unité`.
5. Il confirme.
6. L’application ouvre automatiquement le suivi.
7. Il observe Confirmée/Préparation/Prête/Livrée.
8. Après livraison, la commande passe dans l’historique et peut être recommandée.

**Contrôles :** quota restant 1, stock/réservations mis à jour, une seule commande créée même après un nouvel essai réseau du même panier.

### 39.65 Tarhib Employee — réservation avec service

1. Un utilisateur possédant `meeting.book` ouvre Réserver.
2. Il choisit Palm Room, 8 personnes, demain 10:00–11:00.
3. Avec `meeting.order_services`, il ajoute Business Breakfast.
4. Il confirme.

**Résultat :** réservation enregistrée, créneau bloqué et préparation visible par les agents disposant de `meeting.preparation.*`.

---

### 39.66 Tarhib Operations — parcours Cuisinier

1. Le cuisinier ouvre **Cuisine**.
2. Il filtre les commandes approuvées et ouvre la plus urgente.
3. Il vérifie les lignes et la note.
4. Il sélectionne **Démarrer**.
5. Il prépare, puis sélectionne **Prête**.
6. En cas de manque, il signale la rupture et demande le réapprovisionnement cuisine.

**Limite attendue :** aucun bouton de livraison, d’achat ou de finance.

### 39.67 Tarhib Operations — parcours Livreur avec incident

1. Le livreur ouvre **Livraison** et une tâche `READY`.
2. Il contrôle le destinataire et peut appeler le numéro affiché.
3. Si la remise réussit, il sélectionne **Livrée**.
4. Sinon, il ouvre le signalement d’incident, choisit la raison et décrit précisément le problème.

**Résultat :** la commande/tâche reflète l’incident et le superviseur peut la traiter. Aucune photo de livraison n’est requise.

### 39.68 Tarhib Operations — parcours Responsable stock

1. Consulter les alertes et stocks sous minimum.
2. Vérifier les quantités physiques et réservées.
3. Créer un transfert vers la cuisine.
4. Confirmer le transfert après contrôle.
5. Réceptionner les bons fournisseurs arrivés.
6. Vérifier que les alertes disparaissent et que la disponibilité Employee revient.

---

## 40. Modèles de données de démonstration

Pour une formation ou une recette, utiliser un jeu cohérent :

| Élément           | Exemple                                  |
| ----------------- | ---------------------------------------- |
| Société           | Namaa Consulting                         |
| Branche           | Olaya Branch                             |
| Départements      | Finance, Executive Office                |
| Employé client    | Sara Hassan — Employé standard           |
| Employé VIP       | Ahmed Al Saud — Direction VIP            |
| Cuisinier         | Omar Karim — Cook                        |
| Livreur           | Faisal Noor — Delivery Agent             |
| Responsable stock | Lina Saleh — Stock Manager               |
| Produits finis    | Cappuccino, Eau 330 ml, Plateau exécutif |
| Ingrédients       | Capsule espresso, Lait entier, Sucre     |
| Fournisseur       | Gulf Dairy Supply                        |
| Salle             | Palm Room — 12 places                    |
| Package           | Business Breakfast                       |
| Compte de charge  | 611200 — Consommables hospitalité        |

Ce jeu permet de tester l’enchaînement complet : catalogue → quota → commande → recette/réservation de stock → préparation → livraison → rapports → achat → réception → comptabilité.

---

## 41. Gestion de la performance

**Acces :** Finance > Gestion de la performance.  
**Lecture :** `finance.view`, `finance.manage`, `report.view` ou `company.manage`.  
**Gestion :** `finance.manage` ou `company.manage` selon l'action.

### 41.1 Facturation et encaissements

1. Creer une facture avec societe, dates de service, echeance et lignes.
2. Verifier sous-total, taxes et montant total.
3. Emettre la facture. Cette action poste la creance client et le produit constate d'avance en comptabilite.
4. La reconnaissance du revenu ventile ensuite le montant entre les mois de service et poste les ecritures arrivees a echeance.
5. Enregistrer chaque paiement. Le statut passe automatiquement a `PARTIALLY_PAID` ou `PAID`.
6. Apres emission, utiliser **Telecharger le PDF**. Le document reprend la langue active de l'interface (`ar` ou `en`) et reste identique lors des telechargements suivants grace a sa version et son empreinte SHA-256.

Ne pas enregistrer un paiement superieur au solde restant. Le chiffre d'affaires facture, reconnu et encaisse correspond a trois mesures differentes et doit rester separe.

### 41.2 Budgets

Creer un budget par exercice, version, societe/branche et lignes de centre de cout. Le cycle est :

`DRAFT -> SUBMITTED -> APPROVED -> LOCKED`

Un budget verrouille alimente les cartes budget et ecart. Creer une nouvelle version pour une revision au lieu de modifier une version verrouillee.

### 41.3 Couts et marges

Dans **Saisie des donnees**, choisir **Cout commande** puis renseigner l'identifiant de commande. Le cout produit est calcule automatiquement depuis les lignes et couts catalogue s'il n'est pas saisi. Ajouter les couts de main-d'oeuvre, livraison et frais indirects pour obtenir une marge complete.

La marge brute est calculee sur une meme periode : `revenu reconnu - couts directs figes`.

### 41.4 Indice de satisfaction client

Enregistrer une note de 1 à 5 rattachée à une commande ou une réservation. La carte **مؤشر رضا العملاء** correspond aux notes 4 et 5 divisées par toutes les réponses valides. Les applications clientes peuvent utiliser le même endpoint ; le backend force alors la société et l'employé du compte connecté.

### 41.5 Presence et no-show

Rattacher une presence a la reservation avec `CHECKED_IN`, `COMPLETED` ou `NO_SHOW`, puis indiquer le nombre reel de participants. **Detecter les no-show** classe les reservations confirmees sans check-in une fois le delai de grace depasse.

### 41.6 Previsions

Generer une prevision Demande, Stock ou Tresorerie avec un horizon de 1 a 90 jours. Chaque resultat conserve le modele, les facteurs, la valeur centrale et les bornes basse/haute. Le modele initial `weighted-average-v1` privilegie les observations recentes et reste volontairement explicable.

### 41.7 Mise en service technique

Executer la migration `PerformanceManagement1786450000000`, puis verifier la presence du compte comptable `487000`. Pour rendre correctement l'arabe dans les PDF, definir `PDF_FONT_AR_PATH` vers la police Thmanyah autorisee sur le serveur sans ajouter le fichier de police au depot. Aucun KPI historique ne sera invente : les cartes se rempliront a mesure que factures, couts, feedback et presences seront enregistres.

---

## 42. Exemples concrets pour chaque page et chaque onglet

Cette section est la checklist fonctionnelle exhaustive du Web Admin. Chaque exemple part d'une situation réaliste de Tarhib et précise le résultat attendu. Les libellés peuvent apparaître en arabe ou en anglais selon la langue active.

### 42.1 Accès, accueil et paramètres

| Page ou onglet   | Exemple concret Tarhib                                                                                              | Résultat attendu                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Connexion        | Abdelraouf se connecte avant la prise de service du matin avec son adresse professionnelle.                         | Il arrive sur le tableau de bord avec uniquement les menus autorisés par son rôle.              |
| Tableau de bord  | Le responsable Tripoli voit 18 commandes du jour, dont 4 en attente, puis ouvre la liste depuis la carte concernée. | La page Commandes reprend son périmètre et permet de traiter les quatre commandes prioritaires. |
| Profil           | Un responsable contrôle son rôle « Directeur de branche » puis passe l'interface en arabe.                          | La langue et le sens RTL changent sans modifier ses permissions.                                |
| Page introuvable | Un utilisateur saisit `/finances` au lieu de `/finance`.                                                            | Une page 404 explicite apparaît, sans redirection vers des données sans rapport.                |
| مستندات الشركة   | L'administrateur saisit « عقد التأسيس » et téléverse le PDF compressé de l'acte constitutif de Tarhib.              | Le document reste privé et **عرض المستند** l'ouvre dans le lecteur intégré.                     |

### 42.2 Organisation et permissions

| Page ou onglet | Exemple concret Tarhib                                                                                    | Résultat attendu                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Rôles — Tarhib | Créer « Superviseur cuisine Tripoli » avec file de commandes, préparation et stock cuisine, sans finance. | Le superviseur dispose des outils opérationnels mais d'aucun accès financier ou RH sensible. |
| Rôles — Client | Pour Almadar, créer « Direction VIP », autoriser les salles et 20 plateaux exécutifs par mois.            | Les employés de ce rôle voient les salles et quotas autorisés dans Tarhib Employee.          |
| Rôles — SLA    | Ajouter à Almadar « Direction — 20 min » pour les commandes de direction.                                 | Les commandes héritent de la priorité et de l'échéance configurées.                          |
| Rôles — Test   | Tester le rôle Cuisinier avant de l'attribuer à une recrue.                                               | Le bandeau de test apparaît et seuls les menus de ce rôle sont visibles.                     |
| Sociétés       | Enregistrer « شركة المدار للاتصالات » comme nouveau client actif.                                         | La société devient disponible pour ses branches, contrats, rôles et employés.                |
| Branches       | Ajouter « المدار — طرابلس المركز » à Almadar.                                                             | Stocks, employés, salles et commandes peuvent être isolés sur ce site.                       |
| Départements   | Créer « Direction générale » dans la branche Tripoli.                                                     | Les employés VIP et emplacements de service peuvent être rattachés à cette unité.            |

### 42.3 Utilisateurs et inscriptions

| Page ou onglet          | Exemple concret Tarhib                                                              | Résultat attendu                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Employés clients        | Créer Sara Hassan, Almadar Tripoli, département Finance, rôle Employé standard.     | Sara voit uniquement le catalogue, les quotas et salles de son périmètre.                |
| Employés internes       | Créer Omar Karim comme cuisinier de Tripoli.                                        | Omar voit la préparation et le stock cuisine dans Tarhib Operations, sans les salaires.  |
| Modification d'e-mail   | Remplacer l'ancienne adresse professionnelle de Sara par la nouvelle.               | L'adresse est synchronisée avec Keycloak et devient son identifiant de connexion.        |
| تقمص دور                | Le support reproduit une difficulté signalée par Omar en utilisant l'impersonation. | Le support teste son contexte sans connaître son mot de passe puis revient à son compte. |
| Inscriptions — Demandes | Approuver une recrue Almadar en choisissant branche, département et rôle.           | Le compte approuvé reçoit exactement le périmètre choisi.                                |
| Inscriptions — Inviter  | Inviter cinq employés du département Finance avec le rôle standard.                 | Chacun reçoit le parcours d'activation sans créer une demande libre.                     |

### 42.4 Catalogue, commandes, quotas et réunions

| Page ou onglet           | Exemple concret Tarhib                                                                                        | Résultat attendu                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Catalogue                | Créer « Plateau petit déjeuner exécutif » avec photo, allergènes et recette café, eau, viennoiserie et fruit. | Le produit apparaît si rôle, branche et stock l'autorisent ; sa recette pilote les ingrédients. |
| Commandes                | Traiter 12 cafés et 12 eaux pour une réunion : approbation, préparation, prêt puis livraison.                 | La chronologie atteint `DELIVERED`, le client suit les étapes et le stock est consommé.         |
| Commandes — Rejet        | Rejeter un produit indisponible avec « Machine à café en maintenance ».                                       | Le demandeur et l'historique affichent un motif exploitable.                                    |
| Quotas                   | Donner à Sara deux cappuccinos par jour ; elle en commande un le matin.                                       | Le restant devient 1/2 et un troisième cappuccino est refusé dans la même période.              |
| Salles                   | Créer Palm Room, capacité 12, avec écran et visioconférence.                                                  | La salle active devient réservable et les conflits de créneau sont bloqués.                     |
| Réservations d'une salle | Contrôler la réservation Almadar de lundi 10 h à 11 h pour 10 personnes.                                      | Créneau, participants, statut et services sont visibles dans l'historique.                      |
| Packages de réunion      | Créer Business Breakfast avec café, eau et mini-viennoiseries.                                                | Le package actif est proposé aux rôles autorisés pendant la réservation.                        |

### 42.5 Stock, fournisseurs, achats et VIP

| Page ou onglet       | Exemple concret Tarhib                                                    | Résultat attendu                                                                |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Inventaire — Stock   | Enregistrer 240 eaux dans l'entrepôt central avec un seuil de 60.         | Quantité, zone et état sont visibles et évoluent avec les mouvements.           |
| Inventaire — Alertes | Le lait cuisine descend à 8 unités pour un seuil de 10.                   | L'article apparaît parmi les stocks bas nécessitant transfert ou achat.         |
| Ajustement           | Corriger 100 capsules en 98 avec « Écart inventaire hebdomadaire ».       | Le solde devient 98 et l'audit conserve auteur, date et motif.                  |
| Transferts           | Déplacer 30 eaux de l'entrepôt de branche vers la cuisine puis confirmer. | La source diminue, la destination augmente et le transfert devient `CONFIRMED`. |
| Fournisseurs         | Créer Libya Beverage Supply et fixer l'eau 330 ml à 0,80 د.ل.             | Ce tarif peut préremplir les prochains bons de commande.                        |
| Achats               | Commander 500 eaux puis réceptionner réellement 480 unités.               | Le bon reflète la réception et 480 unités alimentent le stock.                  |
| VIP — Emplacements   | Créer « Coin VIP — Direction Almadar », seuil 12 eaux, agent Faisal.      | L'emplacement est suivi séparément et peut générer une tâche.                   |
| VIP — Tâches         | Faisal prélève 20 eaux de l'entrepôt et termine la tâche.                 | Le stock VIP augmente et la tâche devient `COMPLETED`.                          |

### 42.6 Rapports et audit

| Page ou onglet            | Exemple concret Tarhib                                         | Résultat attendu                                                               |
| ------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Rapports — Vue d'ensemble | Sélectionner le mois et Tripoli avant la réunion de direction. | Les KPI donnent la synthèse du périmètre sans droit de modification implicite. |
| Rapports — Commandes      | Comparer livrées, rejetées et retards SLA de la semaine.       | Le manager identifie les créneaux à renforcer.                                 |
| Rapports — Inventaire     | Rechercher les produits sous seuil et sans coût fiable.        | Le responsable trouve le lait critique et les articles non valorisés.          |
| Rapports — Quotas         | Analyser le quota mensuel Direction VIP d'Almadar.             | Alloué, consommé, restant et taux d'utilisation sont visibles.                 |
| Rapports — Activité       | Filtrer une journée d'inventaire à Tripoli.                    | Les actions administratives sont rapprochées des utilisateurs concernés.       |
| Rapports — Salles         | Comparer Palm Room et Oasis Room sur un mois.                  | Occupation, temps réservé et annulations révèlent la salle la plus sollicitée. |
| Rapports — Achats         | Comparer le coût de l'eau entre deux fournisseurs.             | L'acheteur dispose des quantités et coûts autorisés pour négocier.             |
| Audit                     | Filtrer Inventaire après un écart puis ouvrir l'identifiant.   | L'ajustement -2, son auteur et ses métadonnées sont retrouvés.                 |

### 42.7 Finance et gestion de la performance

| Page ou onglet                         | Exemple concret Tarhib                                                                                | Résultat attendu                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Finance — Vue d'ensemble               | Choisir août 2026 pour comparer revenus, dépenses, dettes et soldes.                                  | Le directeur obtient une synthèse financière mensuelle.                                       |
| Contrats commerciaux                   | Créer le contrat Almadar de 120 000 د.ل, facturation mensuelle, statut actif, avec نسخة العقد signée. | Le contrat contribue aux indicateurs et sa copie privée s'ouvre dans le lecteur.              |
| Dépenses                               | Enregistrer 850 د.ل de consommables cuisine avec référence fournisseur.                               | La dépense apparaît dans sa période et reste traçable.                                        |
| Dettes                                 | Enregistrer 5 000 د.ل puis un paiement de 3 000 د.ل.                                                  | Il reste 2 000 د.ل et le statut devient `PARTIALLY_PAID`.                                     |
| Comptes financiers                     | Créer « Banque — Compte exploitation » avec son solde initial.                                        | Le compte devient disponible pour le suivi financier compatible.                              |
| إدارة الأداء — Vue d'ensemble          | Sélectionner août après facturation et saisie des coûts.                                              | Les cartes séparent revenu reconnu, facturé, encaissé, marge, budget et **مؤشر رضا العملاء**. |
| إدارة الأداء — Factures                | Facturer 10 000 د.ل à Almadar puis enregistrer 6 000 د.ل par virement.                                | La facture passe à `PARTIALLY_PAID` avec 4 000 د.ل restant.                                   |
| إدارة الأداء — Budgets                 | Créer le budget 2027 Opérations de 25 000 د.ل par mois puis l'approuver.                              | La version approuvée alimente budget/réel ; son verrouillage protège l'historique.            |
| إدارة الأداء — Saisie / Coût           | Saisir 120 د.ل produits, 40 main-d'œuvre et 15 livraison pour une commande.                           | Le coût direct figé de 175 د.ل entre dans la marge.                                           |
| إدارة الأداء — Saisie / رضا العملاء    | Après une livraison, saisir 5/5 et « Service ponctuel ».                                              | La réponse contribue à **مؤشر رضا العملاء** de la période.                                    |
| إدارة الأداء — Saisie / Présence       | Pour une réunion de 12 invités, saisir `CHECKED_IN` et 10 présents.                                   | La présence est historisée et la réservation n'est pas un no-show.                            |
| إدارة الأداء — Prévisions / Demande    | Générer 14 jours après plusieurs semaines de commandes de café.                                       | Valeur quotidienne et bornes aident à planifier la charge cuisine.                            |
| إدارة الأداء — Prévisions / Stock      | Sélectionner Capsules espresso et générer Stock.                                                      | Le responsable anticipe le risque de seuil bas.                                               |
| إدارة الأداء — Prévisions / Trésorerie | Générer la trésorerie à partir des factures et paiements.                                             | La direction obtient une projection explicable, distincte du solde bancaire réel.             |

### 42.8 Comptabilité

| Page ou onglet         | Exemple concret Tarhib                                         | Résultat attendu                                                        |
| ---------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Plan comptable         | Créer `611200 — Consommables hospitalité` sous les charges.    | Le compte devient disponible dans les écritures et rapports.            |
| Écritures              | Débiter 611200 de 850 د.ل et créditer Fournisseurs de 850 د.ل. | L'écriture équilibrée peut passer de `DRAFT` à `POSTED`.                |
| Rapports — Balance     | Choisir août 2026 après validation des écritures.              | Total débit et total crédit concordent ; les anomalies sont repérables. |
| Rapports — Grand livre | Choisir 611200 sur août.                                       | Toutes les dépenses du compte sont listées chronologiquement.           |
| Rapports — Bilan       | Choisir le 31 août 2026.                                       | Actifs, passifs et capitaux propres donnent la situation à cette date.  |
| Rapports — Résultat    | Choisir du 1er au 31 août.                                     | Produits et charges permettent de lire le résultat de la période.       |

### 42.9 Ressources humaines

| Page ou onglet                   | Exemple concret Tarhib                                                  | Résultat attendu                                                          |
| -------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Congés — Demandes                | Omar demande trois jours ; le responsable contrôle puis approuve.       | La demande devient `APPROVED` selon les règles de solde.                  |
| Congés — Soldes                  | Consulter le solde annuel d'Omar avant la décision.                     | Disponible, consommé et restant évitent une approbation sans contrôle.    |
| Congés — Types                   | Créer « Congé annuel » avec ses libellés.                               | Le type devient utilisable dans les demandes.                             |
| Contrats RH                      | Créer pour Omar un عقد غير محدد المدة et joindre la نسخة العقد scannée. | Le contrat actif et son document privé sont consultables.                 |
| Évaluations                      | Noter ponctualité, qualité et procédures puis finaliser.                | L'évaluation devient `FINALIZED` et n'est plus un brouillon modifiable.   |
| Bulletins                        | Générer le bulletin d'Omar depuis son salaire de 3 000 د.ل.             | Brut, retenues et net sont détaillés sans altérer le salaire contractuel. |
| Configuration paie — Impôt       | Configurer taux et plafonds validés par la direction.                   | Les nouveaux calculs utilisent la configuration enregistrée.              |
| Configuration paie — Autres taux | Saisir les contributions supplémentaires applicables à Tarhib.          | Les prochaines simulations appliquent ces taux.                           |

### 42.10 Contrôles mobiles associés

| Application ou parcours | Exemple concret Tarhib                                 | Résultat attendu                                                         |
| ----------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| Employee — Commande     | Sara commande un cappuccino dans son quota.            | La commande apparaît dans le Web Admin avec son bon périmètre.           |
| Employee — Réservation  | Sara réserve Palm Room avec Business Breakfast.        | Le créneau est bloqué et les services sont visibles côté administration. |
| Operations — Cuisine    | Omar démarre puis marque prête une commande approuvée. | Le Web Admin reçoit `IN_PROGRESS` puis `READY`.                          |
| Operations — Livraison  | Faisal marque la commande prête comme livrée.          | Elle devient `DELIVERED`, alimente les rapports et clôt le suivi client. |
| Operations — Stock      | Lina confirme 30 eaux vers la cuisine.                 | Les deux zones et leurs alertes sont actualisées dans le Web Admin.      |

---

**Fin du guide**
