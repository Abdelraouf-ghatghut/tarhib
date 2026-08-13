# Audit fonctionnel des applications mobiles Tarhib par rôle

**Date :** 7 août 2026  
**Périmètre audité :** `apps/mobile-employee`, `apps/mobile-operations`, `packages/mobile-shared` et contrats API backend associés.  
**Référence métier :** cahier des charges Tarhib v1.0 consolidé.

## 1. Conclusion exécutive

Les deux nouvelles applications React Native constituent la base mobile à conserver. Leur découpage Employee / Operations, leur authentification partagée, le filtrage d'une grande partie des modules par permissions, le temps réel des commandes et les protections d'idempotence de création de commande sont de bonnes fondations.

Elles ne sont toutefois pas encore prêtes pour garantir le travail quotidien de chaque rôle. Le risque principal n'est pas l'interface graphique : c'est l'absence de validation automatique des parcours rôle × permission × état métier, combinée à des erreurs opérationnelles souvent silencieuses. Un cuisinier, livreur ou responsable stock peut donc voir une action optimiste réussir visuellement, puis revenir à l'état précédent sans explication après le refus du serveur.

### Niveau de préparation estimé

| Application / rôle                       | Couverture actuelle | Verdict                                                              |
| ---------------------------------------- | ------------------: | -------------------------------------------------------------------- |
| Employee — employé client                |              Élevée | Pilote possible après corrections P0                                 |
| Operations — cuisinier                   |               Bonne | Pilote risqué sans gestion d'erreur et tests de transitions          |
| Operations — livreur                     |               Bonne | Pilote risqué sans preuve de remise et mode réseau dégradé           |
| Operations — manager hospitalité         |             Moyenne | Manquent une vraie vue d'exception et des actions groupées sûres     |
| Operations — responsable stock           |             Moyenne | Parcours d'inventaire et de transfert incomplets sur mobile          |
| Operations — responsable achats          |     Moyenne à bonne | Workflow riche, mais ergonomie et validation terrain à renforcer     |
| Operations — ménage / préparation salles |             Moyenne | Affectation et checklists présentes, garanties terrain insuffisantes |
| Operations — direction / admin branche   |    Faible à moyenne | Consultation disponible, administration à réserver au Web Admin      |

## 2. Architecture réellement présente

Le dépôt contient :

- `apps/mobile-employee` : application Expo / React Native destinée aux employés clients ;
- `apps/mobile-operations` : application Expo / React Native destinée au personnel Tarhib ;
- `packages/mobile-shared` : authentification, API, thème, composants, notifications et temps réel partagés ;
- `apps/mobile` : ancienne application Flutter unifiée, encore présente mais devenue ambiguë.

### Recommandation d'architecture

Déclarer officiellement les deux applications React Native comme seules applications actives, archiver Flutter dans une branche ou un dossier `legacy/`, et retirer sa documentation des parcours courants. Maintenir trois implémentations crée un risque de corriger la mauvaise application, de publier un mauvais bundle ou de conserver deux définitions contradictoires d'un même rôle.

## 3. Constats transversaux prioritaires

### P0 — Bloquants avant pilote

1. **Aucun test mobile n'est présent.** Les deux `typecheck` passent, mais aucune suite ne valide les écrans, permissions, transitions, erreurs réseau ou parcours de bout en bout.
2. **Les mutations Operations échouent souvent silencieusement.** Les transitions préparation / prête / livrée font un rollback optimiste sans message utilisateur. L'opérateur ne sait pas si l'action a été refusée, perdue ou exécutée ailleurs.
3. **Les requêtes ne sont pas toutes conditionnées par les permissions.** Le dashboard est chargé pour tous les profils ; l'inventaire est chargé dès qu'une société et une branche existent, même si le rôle ne voit pas le stock. Cela produit des 403 inutiles, masque de vrais défauts et charge le backend.
4. **Pas de stratégie opérationnelle hors-ligne.** Le panier Employee et le catalogue sont partiellement persistés, mais les actions terrain Operations ne disposent ni de bannière globale de connectivité, ni de file de synchronisation, ni de statut « à envoyer ». Une connexion instable peut interrompre le travail.
5. **Pas de garde explicite entre les deux applications.** L'accès dépend du résultat de `/mobile/me` ou `/operations/me`, mais l'application ne présente pas un écran clair « cette application n'est pas autorisée pour votre profil » avec redirection vers l'autre app.
6. **Notifications métier incomplètes.** Une partie des notifications est construite et persistée localement. Elles ne garantissent ni synchronisation multi-appareils, ni acquittement serveur, ni reprise exhaustive après une période hors connexion.

### P1 — Importants pour l'efficacité quotidienne

1. Garantir une couverture complète arabe / anglais : les applications mobiles ne doivent proposer que AR / EN, avec RTL / LTR cohérent sur tous les parcours.
2. Remplacer l'écran Operations monolithique par une navigation par routes. Il faut pouvoir ouvrir une tâche depuis une notification, partager un lien interne et restaurer le dernier écran après fermeture.
3. Uniformiser les états `chargement / vide / erreur / hors-ligne / succès` dans tous les modules Operations. Plusieurs écrans risquent aujourd'hui d'afficher une liste vide lorsqu'une API échoue.
4. Ajouter une confirmation métier aux actions irréversibles ou sensibles : livraison, ajustement absolu de stock, rejet d'achat, annulation et clôture.
5. Journaliser côté client un identifiant de requête et afficher un accusé serveur. Cela facilite le support lorsqu'un opérateur conteste une action.
6. Permettre une reprise de tâche : conserver filtres, branche, commande ouverte et saisies non soumises après mise en arrière-plan.

## 4. Audit par rôle

### 4.1 Employé client — Tarhib Employee

**Objectif principal :** commander rapidement un produit autorisé, connaître son quota, suivre la livraison et réserver une salle sans dépendre du support.

#### Ce qui fonctionne déjà

- catalogue et recherche bilingue ;
- panier persistant, modification des quantités et note libre ;
- création idempotente d'une commande pour éviter les doublons lors d'un retry ;
- actualisation du catalogue, des commandes et des quotas après commande ;
- suivi temps réel avec repli par polling ;
- historique, recommandation et affichage des motifs de rejet ;
- réservation de salles conditionnée par `meeting.book` ;
- langue, thème, profil et notifications.

#### Améliorations nécessaires

- Afficher avant ajout la quantité réellement commandable : minimum de `stock disponible`, `quota restant` et `limite par commande`.
- Vérifier de nouveau le panier avant confirmation et expliquer chaque ligne modifiée ou refusée ; ne pas vider les lignes rejetées.
- Ajouter un bandeau réseau global et distinguer « commande envoyée », « en cours d'envoi » et « échec d'envoi ».
- Afficher la dernière date de synchronisation du quota et du stock.
- Rendre le détail produit complet : allergènes, nutrition, disponibilité, nom AR/EN et avertissement explicite selon le profil alimentaire.
- Permettre l'annulation d'une commande tant qu'elle n'est pas entrée en préparation, si la règle backend l'autorise.
- Dans la réservation : détection immédiate de conflit, fuseau horaire visible, durée, participants, équipements et package de service avec récapitulatif final.
- Remplacer une notification locale manquante par un centre de notifications serveur, avec lecture synchronisée.
- Ajouter l'accessibilité : tailles de texte système, lecteur d'écran, contraste, cibles tactiles de 44 pt minimum et réduction des animations.

#### Critères de recette du rôle

- Un employé ne voit jamais un produit interdit et ne peut jamais dépasser quota ou stock par concurrence.
- Un double tap ou un retry réseau ne crée qu'une commande.
- Après confirmation, le suivi de la bonne commande s'ouvre automatiquement.
- Un changement serveur de statut apparaît en moins de 5 secondes en connexion normale.
- Toute erreur indique quoi faire ensuite, sans perdre le panier.

### 4.2 Cuisinier — Tarhib Operations

**Objectif principal :** préparer la prochaine commande correcte, dans le bon ordre, sans confusion entre branches.

#### Ce qui fonctionne déjà

- file cuisine dédiée ;
- tri par priorité puis échéance SLA ;
- transitions `APPROVED → IN_PROGRESS → READY` alignées avec le backend ;
- possibilité de signaler un incident / une rupture ;
- accès conditionnel au stock cuisine et demande de réapprovisionnement.

#### Améliorations nécessaires

- Faire de « prochaine commande » le premier élément visuel, avec nombre d'articles, temps restant et emplacement de remise.
- Ajouter une vue de préparation par article avec cases à cocher ; interdire « Prête » tant que toutes les lignes ne sont pas traitées ou explicitement en rupture.
- Afficher un succès confirmé par le serveur. En cas de conflit 409, expliquer qu'un autre opérateur a déjà traité la commande et recharger immédiatement.
- Prévoir une prise de possession / attribution de commande afin d'éviter deux cuisiniers sur la même tâche.
- Ajouter un mode « écran cuisine » à fort contraste, grandes cibles et verrouillage anti-veille optionnel.
- Pour une rupture, proposer la quantité disponible, une substitution autorisée ou un rejet partiel, avec notification immédiate à l'employé et au manager.
- Afficher seulement la branche effective et rendre tout changement de périmètre très visible.

### 4.3 Livreur — Tarhib Operations

**Objectif principal :** prendre en charge une commande prête, atteindre le bon destinataire et enregistrer une remise fiable.

#### Ce qui fonctionne déjà

- file de livraison dédiée ;
- acceptation, prise en charge, livraison et signalement d'incident ;
- droits séparés de ceux du cuisinier ;
- temps réel et polling de secours.

#### Améliorations nécessaires

- Afficher en priorité destination, bâtiment, étage, salle / bureau, contact et téléphone ou canal interne.
- Ajouter `Accepter la course` puis `Je suis arrivé`, séparés de `Livrée`, pour donner un statut utile au destinataire.
- Exiger une confirmation de remise adaptée au cahier des charges : bouton glissé + nom du réceptionnaire ou code court ; aucune photo obligatoire.
- Ajouter un fonctionnement réseau dégradé : horodatage local signé, état « à synchroniser » et prévention stricte des doubles livraisons.
- Proposer un itinéraire ordonné pour plusieurs livraisons, avec regroupement par zone.
- Lors d'un incident, proposer des raisons standardisées, une note, l'impact estimé et l'escalade immédiate au manager.
- Après chaque action, afficher un accusé persistant quelques secondes avec possibilité d'annuler quand le backend le permet.

### 4.4 Manager hospitalité / Admin branche

**Objectif principal :** voir les exceptions, réaffecter les ressources et préserver le niveau de service.

#### Ce qui fonctionne déjà

- dashboard, file globale, incidents, filtres société / branche selon le périmètre ;
- accès conditionné par capacités ;
- consolidation des files cuisine et livraison.

#### Améliorations nécessaires

- Créer une boîte de réception d'exceptions : SLA proche, rupture, tâche non affectée, livraison bloquée et salle non prête.
- Ajouter affectation / réaffectation à un opérateur avec charge courante visible.
- Implémenter les actions groupées demandées, mais avec prévisualisation des commandes éligibles et rapport des échecs partiels.
- Séparer KPI consultatifs et actions urgentes ; le dashboard ne doit pas être le point d'entrée principal d'un manager en service.
- Ajouter des filtres mémorisés et une vue « mon équipe maintenant ».
- Afficher les données anciennes comme telles lorsque le temps réel est coupé.

### 4.5 Responsable stock

**Objectif principal :** connaître le stock fiable par niveau, corriger un écart et exécuter les transferts avec traçabilité.

#### Ce qui fonctionne déjà

- consultation des niveaux et alertes ;
- ajustement historisé côté serveur ;
- demandes de réapprovisionnement et ressources de transfert ;
- permissions dédiées.

#### Améliorations nécessaires

- Séparer clairement Central / Branche / Cuisine et toujours afficher la source du chiffre.
- Ne jamais utiliser l'ajustement absolu comme action rapide par défaut : proposer Entrée, Sortie, Perte, Inventaire et Transfert avec motifs contrôlés.
- Pour un transfert, mettre en place `préparé → expédié → reçu`, avec confirmation des quantités reçues et gestion des écarts.
- Ajouter scan code-barres / QR pour produit et emplacement.
- Afficher unité, lot, péremption et historique récent avant validation.
- Permettre un comptage hors-ligne, puis une synchronisation avec résolution de conflit.
- Exiger une double confirmation pour les écarts importants et rendre la raison obligatoire.

### 4.6 Responsable achats

**Objectif principal :** créer, faire valider, envoyer et réceptionner un bon de commande complet.

#### Ce qui fonctionne déjà

- liste fournisseurs et bons de commande ;
- création / modification du brouillon ;
- transitions soumettre, valider, rejeter, envoyer, recevoir et annuler selon permissions ;
- réception par ligne.

#### Améliorations nécessaires

- Scinder le long formulaire en étapes : fournisseur, lignes, coûts, livraison, vérification.
- Ajouter sauvegarde automatique du brouillon et reprise après fermeture.
- Afficher total, taxes, devise, date attendue et écarts de prix avant soumission.
- À la réception, permettre réception partielle, reliquat, refus, lot / péremption et justificatif facultatif.
- Afficher une timeline d'approbation avec auteur, date et motif.
- Prévenir les doubles soumissions par identifiant idempotent.

### 4.7 Personnel ménage et préparation de salles

**Objectif principal :** connaître la prochaine zone / salle à préparer, suivre une checklist et signaler un blocage.

#### Ce qui fonctionne déjà

- tâches de nettoyage ;
- démarrage et clôture ;
- affectation par manager ;
- préparations de réunions avec checklist et transitions ;
- demandes de produits de nettoyage.

#### Améliorations nécessaires

- Unifier les tâches dans « Mon travail aujourd'hui », triées par heure, lieu et urgence.
- Présenter les checklists en grandes lignes cochables, avec progression et éléments obligatoires.
- Afficher plan / localisation, temps prévu, package demandé et notes du client.
- Ajouter `Bloqué` avec motif, matériel manquant et escalade.
- Interdire la clôture si un élément obligatoire reste incomplet, sauf dérogation manager tracée.
- Prévoir une vérification manager distincte de l'exécution.

### 4.8 Direction générale et administrateurs

Le mobile doit servir à consulter et intervenir en urgence, pas à reproduire toute l'administration Web.

- Conserver : KPI, alertes critiques, approbations urgentes, changement de périmètre explicite.
- Renvoyer au Web Admin : création de rôles, paramétrage de modules, seuils globaux, configuration multi-tenant et opérations de masse complexes.
- Exiger une réauthentification pour les actions sensibles et journaliser l'appareil.

## 5. Design de navigation recommandé

### Employee

`Accueil / Catalogue` → `Commandes` → `Réserver` si autorisé → `Profil`.

Le panier reste une action flottante contextuelle avec badge, car il s'agit d'un état temporaire et non d'une destination principale permanente.

### Operations

`Mon travail` → module principal du rôle → `Alertes` → `Plus` → `Profil`.

- Cuisinier : Mon travail, Cuisine, Stock cuisine, Alertes.
- Livreur : Mon travail, Livraisons, Incidents, Profil.
- Stock : Alertes, Inventaire, Transferts, Plus.
- Achats : Bons, Réceptions, Fournisseurs, Plus.
- Manager : Exceptions, Équipe, Vue globale, Plus.

Chaque notification doit ouvrir une route dédiée (`/orders/:id`, `/deliveries/:id`, `/stock/:id`, `/tasks/:id`) et non seulement sélectionner un onglet.

## 6. Plan de mise à niveau

### Lot P0 — Fiabilité métier

- Ajouter une erreur visible et actionnable à toutes les mutations Operations.
- Conditionner chaque requête et chaque écran par la permission exacte.
- Ajouter garde d'application Employee / Operations.
- Ajouter bannière connectivité et états de synchronisation.
- Écrire des tests de contrat des transitions et permissions pour chaque rôle.
- Écrire des tests E2E des parcours critiques sur un environnement de test.

### Lot P1 — Productivité terrain

- Navigation par routes et deep links de notifications.
- Checklists cuisinier, ménage et salles.
- Prise en charge de livraison et preuve de remise sans photo obligatoire.
- Affectation / réaffectation manager.
- Workflow complet de transfert et réception stock.
- Français et audit accessibilité.

### Lot P2 — Optimisation

- Mode hors-ligne contrôlé pour comptage, livraison et tâches.
- Scan QR / code-barres.
- Routage multi-livraisons.
- Analytics d'usage et suivi des abandons / erreurs par parcours.

## 7. Stratégie de tests minimale

### Tests unitaires et composants

- construction des onglets à partir des permissions ;
- état permis / interdit de chaque action ;
- tri priorité + SLA ;
- idempotence commande et soumission achat ;
- restauration panier / brouillon ;
- affichage des erreurs 400, 401, 403, 409, 422, 500 et timeout.

### Tests d'intégration API

Créer un utilisateur de test par rôle par défaut et vérifier :

- endpoints visibles ;
- endpoints refusés ;
- transitions autorisées selon le statut initial ;
- respect société / branche ;
- concurrence de deux opérateurs ;
- notifications émises.

### E2E indispensables

1. Employé : connexion → panier → commande → suivi → livraison.
2. Employé : quota dépassé et stock épuisé pendant la confirmation.
3. Cuisinier : accepter → préparer → rupture partielle → prête.
4. Livreur : prendre en charge → incident → reprise → livraison.
5. Stock : sortie → alerte → demande → transfert → réception.
6. Achats : brouillon → validation → envoi → réception partielle.
7. Ménage / salle : affectation → checklist → blocage → validation manager.
8. Tous rôles : perte réseau, expiration du token et reprise de session.

## 8. Indicateurs de réussite du pilote

- 100 % des actions critiques donnent un accusé serveur ou un état « à synchroniser ».
- 0 action interdite visible pour un rôle sans permission.
- 0 perte de panier, brouillon ou checklist après fermeture inattendue.
- 95 % des commandes courantes réalisées sans aide externe.
- Temps médian : moins de 30 s pour commander, moins de 10 s pour démarrer une préparation, moins de 8 s pour confirmer une livraison.
- Taux d'erreur technique visible inférieur à 1 % des actions.
- Tous les scénarios E2E P0 passent sur Android et iOS avant déploiement pilote.

## 9. Vérifications techniques effectuées

- `npm run typecheck -w apps/mobile-employee` : réussi.
- `npm run typecheck -w apps/mobile-operations` : réussi.
- Recherche de tests dans les deux apps et le package partagé : aucun fichier de test trouvé.
- Lecture des gardes de permissions, requêtes, mutations, API partagées, navigation et persistance locale.

Le passage du typecheck confirme la cohérence TypeScript, pas le bon fonctionnement métier. La priorité immédiate est donc la preuve automatisée que chaque rôle voit les bonnes tâches, peut exécuter uniquement les bonnes transitions et reçoit un retour fiable du serveur.
