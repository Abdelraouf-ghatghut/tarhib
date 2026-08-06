# Chiffrage — Plateforme Tarhib

**Version :** 1.0 · **Date :** 1er août 2026 · **Auteur :** Abdelraouf (freelance)
**Méthode :** périmètre → découpage → charges (PERT) → tarif → risques → prix → échéancier
**Base factuelle :** dépôt Git `tarhib` (26/06 → 22/07/2026) + sessions de développement (30/06 → 01/08/2026)

---

## 0. Mesures réelles (Git + sessions)

Ce chiffrage n'est pas théorique : la charge réellement consommée est mesurée sur le dépôt et
les sessions de travail. Elle sert de **calibrage bas** et de **marge de sécurité**, pas de base de prix
(on facture un produit livré, pas une vélocité outillée).

### 0.1 Dépôt Git

| Indicateur                     | Valeur mesurée                                    |
| ------------------------------ | ------------------------------------------------- |
| Période de commits             | 26/06/2026 → 22/07/2026 (27 jours calendaires)    |
| Commits (hors merges et stash) | 55                                                |
| Pull requests fusionnées       | 16 (#1 → #16)                                     |
| Jours avec au moins un commit  | 12                                                |
| Insertions cumulées            | ~160 700 lignes                                   |
| Suppressions cumulées          | ~24 000 lignes                                    |
| Lignes dans l'arbre de travail | **110 382** (hors `node_modules`, lock, binaires) |
| Fichiers versionnés            | 838                                               |

Répartition du code livré :

| Zone                                | Lignes | Part |
| ----------------------------------- | -----: | ---: |
| Backend NestJS                      | 39 257 | 36 % |
| Portail Web Admin (React)           | 21 575 | 20 % |
| Mobile Flutter (legacy, en retrait) | 19 725 | 18 % |
| Documentation fonctionnelle         |  8 781 |  8 % |
| Mobile Operations (React Native)    |  7 898 |  7 % |
| Mobile Employee (React Native)      |  6 468 |  6 % |
| Packages partagés                   |  4 062 |  4 % |
| Divers / infra / CI                 |  2 616 |  2 % |

Surface fonctionnelle backend mesurée :

| Élément                                           |  Nombre |
| ------------------------------------------------- | ------: |
| Modules NestJS                                    |      37 |
| Endpoints REST (`@Get/@Post/@Patch/@Put/@Delete`) | **242** |
| Entités TypeORM                                   |      52 |
| Classes DTO validées                              |     136 |
| Migrations versionnées                            |      59 |
| Fichiers de tests (`*.spec.ts`)                   |      47 |
| Clés i18n (AR + EN)                               | 749 × 2 |
| Écrans du portail Web Admin                       |      55 |
| Écrans / modales mobile (2 apps RN)               |      38 |

Top 12 des modules backend par volume :

| Module             | Lignes | dont tests |
| ------------------ | -----: | ---------: |
| `auth`             |  3 965 |      1 292 |
| `finance`          |  2 938 |        975 |
| `orders`           |  2 531 |      1 050 |
| `migrations`       |  2 462 |          — |
| `hr`               |  1 903 |        376 |
| `accounting`       |  1 739 |        400 |
| `products`         |  1 646 |        447 |
| `reporting`        |  1 487 |        235 |
| `employees`        |  1 467 |        440 |
| `vip-self-service` |  1 349 |        290 |
| `procurement`      |  1 252 |        277 |
| `inventory`        |  1 125 |        310 |

### 0.2 Sessions de travail (temps actif)

Temps actif reconstitué depuis les journaux de session (agrégation des intervalles < 30 min, les
pauses plus longues ne sont pas comptées) :

| Période       | Jours actifs |     Heures actives | Contenu principal                                                                                         |
| ------------- | -----------: | -----------------: | --------------------------------------------------------------------------------------------------------- |
| 26 → 29/06    |            4 | **~21,0 (estimé)** | Monorepo, Docker, CI, auth/RBAC, org, produits, commandes, quotas, scaffolds Web + Mobile                 |
| 30/06 → 03/07 |            4 |                7,2 | RBAC dynamique, SLA configurables, rapports, design system                                                |
| 04 → 07/07    |            4 |               22,0 | Durcissement auth (cookie HttpOnly, guards globaux), VIP multi-produits, refonte reporting, thème Snow UI |
| 10 → 15/07    |            6 |               17,4 | Apps React Native, modules cleaning / delivery, BFF mobile                                                |
| 18 → 21/07    |            4 |               26,7 | Finance, comptabilité, RH, flux bons de commande, admin VIP                                               |
| 23/07 → 01/08 |            5 |                3,7 | Corrections RTL, stock, HR, catalogue                                                                     |
| **Total**     |       **27** |        **~97,8 h** |                                                                                                           |

> Les journaux des 26–29 juin ne sont pas conservés ; les 21 h sont estimées à partir de la densité
> de commits de ces journées (41 commits dont 26 le 27/06) et du volume de code produit.
> Le mesuré strict est de **76,8 h sur 23 jours** (30/06 → 01/08).

### 0.3 Lecture de ces chiffres

- Charge réelle consommée : **~97,8 h ≈ 12,2 jours-homme de 8 h**, étalés sur 37 jours calendaires.
- Rythme moyen : 3,6 h de travail effectif par jour actif.
- **Cette charge n'est pas le prix.** Elle reflète une productivité outillée (assistance IA, monorepo,
  génération de code) non reproductible par un tiers et non transférable au client. Le prix se
  construit sur la charge qu'un développeur freelance devrait engager pour livrer le même périmètre,
  estimée en §3, et sur la valeur du livrable.
- L'écart entre les deux constitue votre **marge de manœuvre en négociation** : elle est très large,
  ce qui permet d'accepter une remise significative sans jamais travailler à perte.

---

## 1. Périmètre

### 1.1 Utilisateurs

| Famille        | Rôles                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interne Tarhib | Directeur Général (Super Admin), Sous-Directeur / Admin Branche, Manager Hospitalité, Cuisinier, Livreur, Responsable Stock, Responsable Achats, Agent Ménage |
| Client         | Admin société, Manager de département, Employé                                                                                                                |
| Système        | Rôles et permissions créés dynamiquement, sans limite, par module                                                                                             |

### 1.2 Contenu par domaine

| Domaine           | Écrans                                                   | Actions                                             | Règles métier                                                                                | Données                                    |
| ----------------- | -------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Auth & sécurité   | Login, OTP, reset, profil, sessions                      | Connexion SSO, rafraîchissement, révocation         | JWT + refresh en cookie HttpOnly, RBAC par permission, isolation multi-tenant                | Utilisateurs, rôles, permissions, sessions |
| Organisation      | Sociétés, branches, départements, employés, inscriptions | CRUD, rattachement, activation                      | Portée (scope) société/branche appliquée côté serveur                                        | Sociétés, branches, départements, employés |
| Catalogue         | Produits, catégories                                     | CRUD, images, disponibilité                         | Type `commandable` / `libre_service_vip`, filtrage backend par rôle                          | Produits, allergènes, nutrition            |
| Quotas            | Configuration quotas                                     | Définition par société / rôle / produit / période   | Jour / semaine / mois, décrément atomique                                                    | Quotas, consommations                      |
| Commandes         | Panier, liste, détail, file cuisine, livraison           | Créer, approuver, refuser, préparer, livrer         | Moteur de validation en 3 contrôles ordonnés, décision agrégée par panier                    | Commandes, lignes, statuts, historique     |
| Priorité & SLA    | Configuration niveaux SLA                                | Définir niveaux illimités par société               | Priorité P1–P5 dérivée du rôle, compte à rebours recalculé en temps réel                     | Niveaux SLA, échéances                     |
| Stock             | Inventaire, transferts, réappro                          | Entrée, sortie, transfert, ajustement               | 3 niveaux (central → branche → cuisine), rupture branche = indisponibilité immédiate         | Zones, mouvements, seuils                  |
| VIP libre-service | Emplacements, tâches                                     | Créer emplacement, affecter produits, générer tâche | Jamais de commande / quota / SLA, seuils dédiés déclenchant une tâche de réapprovisionnement | Emplacements, produits VIP, tâches         |
| Achats            | Fournisseurs, bons de commande                           | Créer, approuver, refuser, réceptionner             | Réception partielle, alimentation du stock                                                   | Fournisseurs, BC, réceptions               |
| Salles de réunion | Salles, réservations, packages, préparations             | Réserver, annuler, préparer                         | Disponibilité, capacité, équipements, packages                                               | Salles, réservations, packages             |
| Ménage            | Produits, stock, tâches                                  | Assigner, exécuter, valider                         | Consommation de produits d'entretien                                                         | Tâches, produits, stock ménage             |
| Finance (Tarhib)  | Vue d'ensemble, contrats, dépenses, dettes, comptes      | Saisir, régler, suivre soldes                       | Comptabilité propre à Tarhib, jamais exposée au client final                                 | Contrats, dépenses, dettes, comptes        |
| Comptabilité      | Plan comptable, écritures, états                         | Saisir, lettrer, éditer                             | Partie double, balance / grand livre                                                         | Comptes, journaux, écritures               |
| RH                | Contrats, congés, bulletins, évaluations                 | Demander, approuver, éditer                         | Circuit d'approbation congés                                                                 | Contrats, absences, paies                  |
| Rapports          | 7 onglets analytiques                                    | Filtrer, comparer, exporter                         | Agrégations par période / branche / produit                                                  | Vues agrégées                              |
| Notifications     | Centre de notifications                                  | Lire, marquer                                       | Push FCM, temps réel Socket.io                                                               | Notifications                              |
| Audit             | Journal                                                  | Consulter, filtrer                                  | Traçabilité des actions sensibles                                                            | Journal d'audit                            |

### 1.3 Inclus / non inclus / optionnel

**Inclus au forfait**

- Backend NestJS multi-tenant, PostgreSQL, Redis, migrations versionnées
- Authentification Keycloak, JWT, RBAC dynamique par module et permission
- Portail Web Admin React + Ant Design, thèmes clair/sombre
- Deux applications mobiles React Native (Employee, Operations)
- Internationalisation AR / EN / FR avec support RTL complet
- Temps réel Socket.io (statuts de commande, file cuisine, alertes SLA)
- Notifications push FCM et e-mail
- Exports PDF et Excel des rapports
- Tests unitaires du moteur de validation, des quotas et du flux VIP
- Déploiement, import initial des référentiels, formation, documentation

**Non inclus**

- Toute gestion de budget monétaire côté employé (interdit par la règle métier §3.1 du CLAUDE.md)
- Paiement en ligne dans l'application employé
- Commande sur les produits VIP libre-service
- Panier partagé entre plusieurs employés
- Mode hors connexion des applications mobiles
- Intégrations ERP / SIRH externes
- Applications natives distinctes iOS et Android (React Native uniquement)
- Reprise et retrait de l'application Flutter historique (`apps/mobile`, 19 725 lignes) : code
  existant conservé en l'état, hotfix uniquement, aucune évolution facturée dessus

**Optionnel (devis séparé)**

- Comptabilité en partie double avancée (lettrage, clôtures, exercices)
- Mode hors connexion terrain pour l'app Operations
- Intégrations ERP / SIRH
- Rapports personnalisés au-delà des 7 onglets standards
- Migration de données existantes complexe
- Publication et maintenance des comptes App Store / Google Play

**À préciser avec le client**

- Volumétrie cible : nombre de sociétés clientes, branches, employés, commandes/jour
- Politique de rétention des données et exigences de conformité locale
- Hébergement : VPS dédié ou hébergement mutualisé
- Périmètre exact de la reprise de l'existant (fichiers Excel, autre outil)
- Canaux de notification retenus (SMS Twilio facturé à l'usage ou non)

---

## 2. Découpage en lots

| Lot     | Intitulé                   | Contenu                                                                                                                       |
| ------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **L0**  | Analyse & conception       | Ateliers, spécifications, parcours utilisateurs, modèle de données, maquettes, validation du périmètre                        |
| **L1**  | Socle technique            | Monorepo, Docker, CI/CD, PostgreSQL, Redis, Keycloak, JWT, RBAC dynamique, permissions, multi-tenant, audit, sauvegardes      |
| **L2**  | Organisation & employés    | Sociétés, branches, départements, employés, inscriptions, portées                                                             |
| **L3**  | Catalogue & quotas         | Produits, catégories, images, disponibilité, quotas par société/rôle/produit/période                                          |
| **L4**  | Commandes, priorité & SLA  | Panier, moteur de validation, approbations, cycle de vie, file cuisine, livraison, temps réel, niveaux SLA configurables      |
| **L5**  | Stock & VIP libre-service  | Stock 3 niveaux, entrées/sorties, transferts, seuils, alertes, réapprovisionnement, emplacements et tâches VIP                |
| **L6**  | Fournisseurs & achats      | Fournisseurs, bons de commande, approbation, réception, historique                                                            |
| **L7**  | Salles & services          | Salles, équipements, réservations, packages, préparations                                                                     |
| **L8**  | Finance, comptabilité & RH | Contrats, dépenses, dettes, comptes, plan comptable, écritures, états financiers, contrats RH, congés, bulletins, évaluations |
| **L9**  | API rapports & agrégations | Indicateurs, agrégations par période/branche/produit, exports                                                                 |
| **L10** | Portail Web Admin          | 55 écrans, navigation, design system, thèmes clair/sombre, tableaux de bord, graphiques                                       |
| **L11** | App mobile Employee        | Catalogue, détail, panier, confirmation, suivi temps réel, historique, réservation de salles, profil                          |
| **L12** | App mobile Operations      | File d'attente, détail commande, cuisine, livraison, stock, ménage, incidents, réunions, achats, tableau de bord manager      |
| **L13** | i18n, RTL & design system  | AR / EN / FR, RTL complet, propriétés logiques CSS, police Thmanyah, cohérence graphique                                      |
| **L14** | Finalisation               | Tests, recette, sécurité, import initial, formation, documentation, mise en production                                        |

---

## 3. Estimation des charges (PERT)

Formule appliquée : **(Optimiste + 4 × Probable + Pessimiste) / 6**

### 3.1 Charges de développement par lot

| Lot                               | Optimiste | Probable | Pessimiste |    **PERT** |
| --------------------------------- | --------: | -------: | ---------: | ----------: |
| L0 Analyse & conception           |         8 |       12 |         18 |    **12,3** |
| L1 Socle technique                |        14 |       20 |         32 |    **21,0** |
| L2 Organisation & employés        |         6 |        9 |         14 |     **9,3** |
| L3 Catalogue & quotas             |         6 |        9 |         15 |     **9,5** |
| L4 Commandes, priorité & SLA      |        13 |       20 |         32 |    **20,8** |
| L5 Stock & VIP libre-service      |        10 |       15 |         24 |    **15,7** |
| L6 Fournisseurs & achats          |         5 |        8 |         13 |     **8,3** |
| L7 Salles & services              |         5 |        8 |         13 |     **8,3** |
| L8 Finance, comptabilité & RH     |        14 |       21 |         34 |    **22,0** |
| L9 API rapports & agrégations     |         6 |        9 |         15 |     **9,5** |
| L10 Portail Web Admin (55 écrans) |        24 |       34 |         52 |    **35,3** |
| L11 App mobile Employee           |        10 |       15 |         24 |    **15,7** |
| L12 App mobile Operations         |        12 |       18 |         28 |    **18,7** |
| L13 i18n, RTL & design system     |         5 |        8 |         13 |     **8,3** |
| **Total lots**                    |   **138** |  **206** |    **327** | **214,7 j** |

Dont développement pur (hors L0) : **202,4 j**.

### 3.2 Activités transverses (étape 4 de la méthode)

Appliquées sur la base développement de 202,4 j :

| Activité                           |        Taux retenu |          Charge |
| ---------------------------------- | -----------------: | --------------: |
| Analyse & conception               | déjà comptée en L0 |          12,3 j |
| Gestion de projet, réunions, suivi |               10 % |          20,2 j |
| Tests, recette, corrections (L14)  |               20 % |          40,5 j |
| Déploiement, infra, sauvegardes    |                4 % |           8,1 j |
| Documentation & formation          |                5 % |          10,1 j |
| **Sous-total avant risque**        |                    |     **293,6 j** |
| Réserve risque & imprévus          |               15 % |          44,0 j |
| **Charge totale retenue**          |                    | **≈ 338 jours** |

### 3.3 Confrontation avec le réel mesuré

| Base                               |          Charge |
| ---------------------------------- | --------------: |
| Charge estimée méthode PERT (§3.2) |           338 j |
| Charge réellement consommée (§0.2) | 12,2 j (97,8 h) |
| Rapport                            |       **≈ 27×** |

Ce rapport n'est pas une erreur d'estimation : il mesure l'effet de l'outillage, de la réutilisation
et d'un monorepo unique servant trois applications. Il est **interne** — il ne figure pas dans le devis
client. Le devis vend un périmètre livré, garanti et maintenu, pas un décompte d'heures.

---

## 4. Tarif journalier

| Élément annuel                          |          Montant |
| --------------------------------------- | ---------------: |
| Revenu personnel visé                   |       60 000 LYD |
| Charges, matériel, logiciels, connexion |       12 000 LYD |
| Réserve, impayés, prospection           |        8 000 LYD |
| **Total à couvrir**                     |   **80 000 LYD** |
| Jours réellement facturables par an     |              150 |
| **TJM calculé**                         | **533 LYD/jour** |
| **TJM commercial retenu**               | **550 LYD/jour** |

Grille de négociation (le plancher reste très largement au-dessus du coût réel constaté) :

|     TJM | Positionnement                                                              |
| ------: | --------------------------------------------------------------------------- |
| 350 LYD | Plancher, uniquement contre un paiement rapide ou une référence stratégique |
| 450 LYD | **Prix recommandé** — compromis marché, marge confortable                   |
| 550 LYD | Prix affiché au devis, base des remises                                     |

---

## 5. Trois niveaux d'offre

### Offre 1 — MVP

Socle, organisation, catalogue, quotas, commandes avec moteur de validation, stock simple à un
niveau, rapports essentiels, portail admin réduit (~25 écrans), application Employee, AR + EN.

### Offre 2 — Standard _(recommandée)_

MVP complet + stock 3 niveaux et transferts, VIP libre-service, fournisseurs et achats, salles et
packages, SLA configurables et temps réel, 7 onglets de rapports avec exports, portail admin
complet (55 écrans), application Operations, français en 3ᵉ langue, import initial et formation.

### Offre 3 — Avancée

Standard + finance Tarhib, comptabilité en partie double, module RH complet, tableaux de bord
avancés, socle prêt pour intégrations externes.

### Charges et prix

| Offre            | Lots                                                                                    |    Charge | Prix @350 | **Prix @450** | Prix @550 |
| ---------------- | --------------------------------------------------------------------------------------- | --------: | --------: | ------------: | --------: |
| **1 — MVP**      | L0, L1, L2, L3, L4 (allégé), L5 (simple), L9 (partiel), L10 (partiel), L11, L13 (AR/EN) | **193 j** |    67 550 |    **86 850** |   106 150 |
| **2 — Standard** | Offre 1 complétée + L5 complet, L6, L7, L9, L10 complet, L12, L13 (AR/EN/FR)            | **303 j** |   106 050 |   **136 350** |   166 650 |
| **3 — Avancée**  | Offre 2 + L8 (finance, comptabilité, RH)                                                | **338 j** |   118 300 |   **152 100** |   185 900 |

_Montants en LYD, hors coûts récurrents (§7) et hors options (§6)._

---

## 6. Risques et options

### 6.1 Matrice des risques

| Fonctionnalité                               | Risque        | Traitement                                              |
| -------------------------------------------- | ------------- | ------------------------------------------------------- |
| Auth, CRUD référentiels                      | Faible        | Forfait                                                 |
| Catalogue, salles, fournisseurs              | Faible        | Forfait                                                 |
| Stock 3 niveaux et transferts                | Moyen         | Forfait                                                 |
| Moteur de validation des commandes           | Moyen         | Forfait, couverture de tests exigée avant recette       |
| RBAC dynamique illimité + multi-tenant       | Moyen à élevé | Forfait, réserve de 15 %                                |
| Temps réel Socket.io et compte à rebours SLA | Moyen à élevé | Forfait, réserve de 15 %                                |
| RTL arabe complet sur 3 applications         | Moyen à élevé | Forfait, recette dédiée RTL                             |
| Comptabilité en partie double                | Très élevé    | **Option**, jamais au forfait de base                   |
| Mode hors connexion mobile                   | Très élevé    | **Option**                                              |
| Publication App Store / Google Play          | Élevé         | **Option**, dépend des comptes et validations du client |
| Migration de données existantes              | Variable      | **Option**, chiffrée après audit des sources            |
| Intégrations ERP / SIRH                      | Élevé         | **Option**                                              |

### 6.2 Options chiffrées séparément

| Option                                                                |   Charge |     Prix @450 |
| --------------------------------------------------------------------- | -------: | ------------: |
| Comptabilité en partie double avancée (lettrage, clôtures, exercices) |     25 j |        11 250 |
| Mode hors connexion app Operations                                    |     22 j |         9 900 |
| Publication et suivi App Store + Google Play                          |      8 j |         3 600 |
| Migration de données existantes (après audit)                         | 6 à 20 j | 2 700 à 9 000 |
| Rapports personnalisés (par lot de 3)                                 |      7 j |         3 150 |
| Intégration ERP / SIRH (par système)                                  |     15 j |         6 750 |
| Passerelle SMS / e-mail transactionnel avancée                        |      5 j |         2 250 |

---

## 7. Coûts ponctuels et récurrents

### Ponctuels — inclus au forfait

Analyse, conception, développement, tests, import initial des référentiels, déploiement, formation,
documentation.

### Récurrents — à la charge du client, facturés séparément

| Poste                                     |                                Montant |
| ----------------------------------------- | -------------------------------------: |
| Hébergement mutualisé                     |                         1 500 LYD / an |
| **ou** VPS dédié : configuration initiale |                   1 000 LYD (une fois) |
| **ou** VPS dédié : abonnement             |                         4 800 LYD / an |
| Nom de domaine, certificats               |                          ~300 LYD / an |
| Services externes (FCM, e-mail, SMS)      |           à l'usage, refacturé au réel |
| **Maintenance — support de base**         | **15 % du prix de développement / an** |
| **Maintenance — support avancé**          | **22 % du prix de développement / an** |

Exemple sur l'offre Standard à 450 LYD/j (136 350 LYD) :

| Formule                |     Coût annuel |
| ---------------------- | --------------: |
| Support de base (15 %) | 20 453 LYD / an |
| Support avancé (22 %)  | 29 997 LYD / an |

**Support de base** : corrections de bugs, mises à jour de sécurité, sauvegardes surveillées,
assistance sous 3 jours ouvrés.
**Support avancé** : idem + assistance sous 24 h, évolutions mineures dans une enveloppe de
2 jours/mois, astreinte sur incidents bloquants.

---

## 8. Planning

Le planning est exprimé en **semaines calendaires** à un rythme de 5 jours facturables par semaine,
hors délais de validation client.

| Phase                     |    Offre 1 (MVP) | Offre 2 (Standard) | Offre 3 (Avancée) |
| ------------------------- | ---------------: | -----------------: | ----------------: |
| Analyse & conception      |       3 semaines |         3 semaines |        3 semaines |
| Socle technique           |       4 semaines |         4 semaines |        4 semaines |
| Développement fonctionnel |      17 semaines |        32 semaines |       37 semaines |
| Tests & recette           |       5 semaines |         8 semaines |        9 semaines |
| Déploiement & formation   |       2 semaines |         2 semaines |        2 semaines |
| **Total**                 | **~31 semaines** |   **~49 semaines** |  **~55 semaines** |

Jalons de livraison intermédiaires (offre Standard) : socle + auth en semaine 7, commandes
fonctionnelles en semaine 16, stock et achats en semaine 26, applications mobiles en semaine 35,
recette complète en semaine 45.

---

## 9. Échéancier de paiement

| Étape                                  |      Part | Offre 1 @450 | **Offre 2 @450** | Offre 3 @450 |
| -------------------------------------- | --------: | -----------: | ---------------: | -----------: |
| Réservation et démarrage               |      20 % |       17 370 |       **27 270** |       30 420 |
| Validation des spécifications (fin L0) |      20 % |       17 370 |       **27 270** |       30 420 |
| Livraison du premier lot fonctionnel   |      25 % |       21 713 |       **34 088** |       38 025 |
| Livraison de la version complète       |      25 % |       21 713 |       **34 088** |       38 025 |
| Recette et mise en production          |      10 % |        8 685 |       **13 635** |       15 210 |
| **Total**                              | **100 %** |   **86 850** |      **136 350** |  **152 100** |

Conditions : facturation à l'atteinte de chaque jalon, règlement à 15 jours. Tout retard de
paiement supérieur à 30 jours suspend les travaux sans report des jalons contractuels.

**Recommandation forte :** ne jamais engager la phase de développement avant l'encaissement des
deux premières tranches (40 %), soit 54 540 LYD sur l'offre Standard.

---

## 10. Phase d'analyse payante préalable

Aucun forfait ferme n'est engagé avant la réalisation de la phase d'analyse.

| Élément               | Valeur                                         |
| --------------------- | ---------------------------------------------- |
| Charge                | 12,3 j                                         |
| Prix @450             | **5 535 LYD**                                  |
| Durée                 | 3 semaines                                     |
| Déductible du forfait | Oui, si le projet est engagé dans les 60 jours |

Livrables de fin de phase : liste exhaustive des écrans, règles métier formalisées, modèle de
données, découpage en lots, estimation en jours, planning daté, prix ferme, exclusions,
critères d'acceptation.

---

## 11. Gestion des modifications

Toute demande absente du périmètre signé fait l'objet d'un devis complémentaire.

| Champ            | Contenu                                |
| ---------------- | -------------------------------------- |
| Demande          | Fonctionnalité ajoutée ou modifiée     |
| Impact technique | Modules et écrans concernés            |
| Charge           | Estimation PERT en jours               |
| Prix             | Charge × TJM contractuel               |
| Impact planning  | Décalage en jours ou semaines          |
| Validation       | Accord écrit du client avant exécution |

**Corrections incluses :** 2 tours de correction par lot livré, dans le périmètre spécifié. Au-delà,
facturation au TJM.

---

## 12. Conditions contractuelles

| Clause                    | Contenu                                                                                                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Garantie**              | 3 mois après la mise en production, corrections des anomalies bloquantes et majeures sans frais                                                                                                                                                                                             |
| **Propriété du code**     | Transférée au client au paiement intégral. Les composants génériques réutilisables restent la propriété du prestataire, sous licence perpétuelle non exclusive accordée au client                                                                                                           |
| **Police Thmanyah**       | Licence à acquérir par le client. Contraintes respectées : pas de redistribution, pas de modification, pas d'extraction, pas de revente séparée                                                                                                                                             |
| **Critères de réception** | Tous les cas de la matrice de décision du moteur de validation passent ; les 3 langues et le RTL sont fonctionnels sur les 3 applications ; les rapports produisent des exports PDF et Excel conformes ; l'isolation multi-tenant est vérifiée par test ; aucune anomalie bloquante ouverte |
| **Hypothèses**            | Le client fournit les référentiels initiaux, un interlocuteur unique disponible, les accès aux comptes stores, et valide chaque jalon sous 5 jours ouvrés                                                                                                                                   |
| **Réversibilité**         | Livraison du dépôt Git complet, des migrations, de la documentation d'exploitation et des procédures de sauvegarde                                                                                                                                                                          |

---

## 13. Synthèse pour la proposition commerciale

|                            |   Offre 1 — MVP | **Offre 2 — Standard** | Offre 3 — Avancée |
| -------------------------- | --------------: | ---------------------: | ----------------: |
| Charge                     |           193 j |              **303 j** |             338 j |
| Délai                      |    ~31 semaines |       **~49 semaines** |      ~55 semaines |
| Prix ferme (TJM 450)       |      86 850 LYD |        **136 350 LYD** |       152 100 LYD |
| Maintenance base (15 %/an) |      13 028 LYD |         **20 453 LYD** |        22 815 LYD |
| Hébergement VPS (an 1)     |       5 800 LYD |          **5 800 LYD** |         5 800 LYD |
| **Coût an 1**              | **105 678 LYD** |        **162 603 LYD** |   **180 715 LYD** |

**Recommandation :** proposer l'offre Standard au prix affiché de 166 650 LYD (TJM 550), avec une
remise commerciale négociable jusqu'à 136 350 LYD (TJM 450). Le plancher absolu est de
106 050 LYD (TJM 350) ; en dessous, refuser — non par manque de marge, mais parce qu'un prix
trop bas dévalue le produit et attire les demandes de modification sans fin.
