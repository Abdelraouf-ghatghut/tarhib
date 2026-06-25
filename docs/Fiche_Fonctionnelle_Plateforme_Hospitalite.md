# Fiche Fonctionnelle — Tarhib
## Plateforme de Gestion Hospitalité Corporate

**Version :** 1.1
**Plateformes :** Application Mobile (iOS/Android) + Portail Web Admin
**Langues :** Arabe (par défaut, RTL) / Anglais
**Architecture :** Multi-tenant, Multi-société, Multi-branche

---

## 0. Stack technique recommandée

| Couche | Technologie |
|---|---|
| Mobile | Flutter (Dart), Drift/SQLite ou Hive pour mode offline |
| Web Admin | React + TypeScript, Ant Design / MUI (RTL natif) |
| Backend | NestJS (Node.js/TS) ou Spring Boot (Java) |
| Base de données | PostgreSQL (transactionnel), Redis (cache/queues) |
| Recherche/Logs | Elasticsearch (optionnel, audit & reporting) |
| Temps réel | Socket.io / WebSockets |
| Auth | Keycloak (RBAC + SSO Azure AD/Google futur), JWT, OTP via Twilio |
| Notifications | Firebase Cloud Messaging, SendGrid/SES, Twilio SMS |
| Stockage fichiers | AWS S3 / MinIO |
| Infra | Docker + Kubernetes, CI/CD (GitHub Actions) |
| i18n | i18next + CSS logical properties (RTL) côté Web Admin · `flutter_localizations` + `intl` (RTL natif) côté Mobile |

---

## 1. Authentification & Sécurité
- [ ] Inscription utilisateur
- [ ] Connexion (email/mot de passe)
- [ ] Connexion par OTP mobile
- [ ] Récupération de mot de passe
- [ ] Authentification multi-facteurs (MFA) optionnelle
- [ ] Connexion Azure AD (futur)
- [ ] Connexion Google Workspace (futur)
- [ ] Gestion des rôles et permissions (RBAC)
- [ ] Gestion des sessions (expiration, multi-device)
- [ ] Journalisation des actions utilisateurs
- [ ] Pistes d'audit (audit trail)

## 2. Gestion des Sociétés Clientes
- [ ] Création de société (nom, code, adresse, pays, fuseau horaire, contact, facturation)
- [ ] Modification des informations société
- [ ] Configuration langue par défaut
- [ ] Configuration quotas globaux
- [ ] Configuration politiques de priorité
- [ ] Configuration horaires de travail

## 3. Gestion des Branches
- [ ] Création de branche (nom, code, adresse, ville, pays, contact, responsable)
- [ ] Modification de branche
- [ ] Désactivation de branche
- [ ] Affectation des employés à une branche
- [ ] Affectation des salles de réunion à une branche

## 4. Gestion des Départements
- [ ] Création de département
- [ ] Affectation des employés au département
- [ ] Attribution de quotas par département

## 5. Gestion des Employés
- [ ] Création de fiche employé (ID, nom, email, mobile, poste, département, branche, société)
- [ ] Modification / désactivation de fiche employé
- [ ] Catégorisation : Employé / Superviseur / Manager / Directeur / Exécutif / VIP
- [ ] Historique de consommation par employé

## 6. Gestion des Produits
- [ ] Catalogue produit (nom AR/EN, description, catégorie, unité, image, fournisseur, prix d'achat/vente, statut actif)
- [ ] Gestion des catégories : Café, Thé, Boissons chaudes, Eau, Sodas, Jus, Snacks, Sandwichs, Boulangerie, Fruits, Desserts, Petit-déjeuner, Déjeuner, Fournitures de réunion
- [ ] Type de produit : **Commandable** (passe par le moteur de commande/quota) vs **Libre-service VIP** (jamais commandé via l'app — produit déjà mis à disposition physiquement dans le bureau/frigo VIP, suivi uniquement côté stock et achat)
- [ ] Visibilité des produits commandables par rôle, si restriction applicable (filtrage côté backend)
- [ ] Activation/désactivation produit
- [ ] Recherche & filtres produits

## 7. Gestion des Fournisseurs
- [ ] Fiche fournisseur (nom, contact, email, téléphone, adresse)
- [ ] Catalogue produits par fournisseur
- [ ] Gestion des accords de prix
- [ ] Suivi de la performance fournisseur

## 8. Gestion des Achats (Procurement)
- [ ] Création de bon de commande
- [ ] Workflow : Brouillon → Soumis → Approuvé → Commandé → Reçu → Clôturé
- [ ] Approbation des bons de commande
- [ ] Réception des produits
- [ ] Gestion des factures
- [ ] Suivi des livraisons fournisseurs

## 9. Gestion des Stocks (Inventaire)
- [ ] Inventaire en temps réel, séparé par branche
- [ ] Gestion d'emplacements de stock spécifiques en plus de la branche : **Frigo/Bureau VIP dédié** (un emplacement par exécutif/VIP équipé), pour les produits en libre-service
- [ ] Entrée de stock
- [ ] Sortie de stock
- [ ] Ajustement de stock
- [ ] Enregistrement des pertes/gaspillage
- [ ] Retours produits
- [ ] Transferts entre branches
- [ ] Seuils : stock minimum, stock maximum, point de réapprovisionnement (par branche ET par emplacement VIP)
- [ ] Alertes automatiques : stock bas, produit expiré, proche expiration, produit indisponible
- [ ] Pour les emplacements VIP en libre-service : alerte de seuil bas déclenche directement une **tâche de réapprovisionnement** (pas une commande) assignée à l'Agent d'Hospitalité ou à l'Inventory Manager, et alimente le module Achats si le stock central est lui aussi insuffisant

## 10. Transferts de Stock Inter-Branches
- [ ] Demande de transfert
- [ ] Approbation du transfert
- [ ] Expédition
- [ ] Confirmation de réception
- [ ] Historique des transferts
- [ ] Validation des quantités reçues

## 11. Commandes Employés
- [ ] Commandes instantanées (café, thé, eau, snacks)
- [ ] Commandes programmées (livraison future)
- [ ] Commandes groupées (équipe/département)
- [ ] Commandes pour salle de réunion
- [ ] Sélection multi-produits dans une même commande, limitée individuellement par quota produit
- [ ] Catalogue de commande limité aux produits **commandables** (les produits VIP en libre-service n'apparaissent jamais ici, quel que soit le rôle, puisqu'ils ne se commandent pas)
- [ ] Moteur de validation automatique (rôle, stock, quota) avant mise en file
- [ ] Workflow : Création → Validation automatique → File d'attente → Préparation → Livraison → Service → Clôture

## 12. Gestion des Priorités
- [ ] Niveaux de priorité configurables (P1 à P5)
- [ ] Règles de priorisation automatique (rôle, importance réunion, heure de création, heure prévue)
- [ ] Gestion VIP : service dédié, fast-track, menus spéciaux, quotas personnalisés
- [ ] Gestion des SLA par priorité (ex : P1 = 5 min, P5 = 30 min)
- [ ] Alertes de dépassement de SLA

## 13. Gestion des Quotas
- [ ] Quotas par produit / utilisateur / département / branche / société
- [ ] Périodes : journalier, hebdomadaire, mensuel
- [ ] Configuration d'exemples (ex : max 2 cafés/jour)
- [ ] Validation automatique des commandes selon quota : approbation requise, ou rejet selon config

## 14. Gestion des Salles de Réunion
- [ ] Fiche salle (nom, capacité, étage, bâtiment, branche)
- [ ] Demandes de service hospitalité (café, thé, eau, jus, snacks, petit-déjeuner, déjeuner)
- [ ] Workflow : Demande → Approbation → Affectation → Préparation → Installation → Clôture

## 15. Opérations Cuisine
- [ ] Tableau de bord cuisine (nouvelles commandes, en préparation, en retard, VIP)
- [ ] File d'attente triée par : priorité, horaire réunion, heure de commande

## 16. Gestion des Livraisons
- [ ] Planification des livraisons
- [ ] Affectation des tournées
- [ ] Suivi en temps réel
- [ ] Confirmation de livraison
- [ ] Statuts : En attente, Affectée, En transit, Livrée, Clôturée

## 17. Gestion du Service Hospitalité sur Site
- [ ] Service boissons bureau
- [ ] Service bureau exécutif
- [ ] Installation salle de réunion
- [ ] Support événementiel
- [ ] Checklist de clôture (produits livrés, salle préparée, nettoyage effectué)

## 18. Centre de Notifications
- [ ] Notifications employé : commande reçue/acceptée/livrée, quota dépassé
- [ ] Notifications staff : nouvelles commandes, alertes stock, affectations livraison, demandes salle
- [ ] Canaux : Push, Email, SMS (optionnel)

## 19. Rapports & Analytique
- [ ] Rapports opérationnels (commandes par branche/société/employé/produit)
- [ ] Rapports d'inventaire (stock actuel, valorisation, produits expirés, gaspillage)
- [ ] Rapports d'achats (performance fournisseur, coûts, retards de livraison)
- [ ] Rapports financiers (coûts par société/branche/département)
- [ ] Rapports hospitalité (produits les plus consommés, usage salles, performance VIP)
- [ ] Rapports SLA (conformité, commandes en retard, indicateurs VIP)

## 20. Tableaux de Bord
- [ ] Dashboard exécutif (commandes totales, consommation, alertes actives, statut stock, top produits)
- [ ] Dashboard branche (commandes, inventaire, coûts, performance service)

## 21. Support Multilingue
- [ ] Arabe (par défaut), support RTL complet
- [ ] Anglais, traduction complète
- [ ] Changement de langue dynamique
- [ ] Préférence de langue par utilisateur et par société

## 22. Audit & Conformité
- [ ] Piste d'audit : actions utilisateurs, changements de stock, modifications de commandes, approbations
- [ ] Politiques de rétention des données
- [ ] Logs d'accès
- [ ] Logs de sécurité

---

## Exigences Non-Fonctionnelles
- [ ] Temps de réponse < 3 secondes
- [ ] Mises à jour en temps réel
- [ ] Mode hors-ligne pour le personnel mobile
- [ ] Disponibilité 99,9%
- [ ] Scalabilité illimitée (sociétés, branches, employés, produits)
- [ ] HTTPS, chiffrement au repos, RBAC, logs d'audit

---

## Évolutions Futures (Backlog)
- [ ] Retrait de commande par QR Code
- [ ] Prévision de consommation par IA
- [ ] Recommandations de réapprovisionnement intelligent
- [ ] Intégration Microsoft 365
- [ ] Intégration Google Calendar
- [ ] Services hospitalité visiteurs
- [ ] Gestion catering & événementiel
- [ ] Reconnaissance faciale (pointage staff)
- [ ] Dashboards Business Intelligence avancés
- [ ] Gestion prédictive des stocks
- [ ] Intégration ERP (SAP, Oracle, Microsoft Dynamics)
