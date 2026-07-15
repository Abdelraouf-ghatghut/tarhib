# Tarhib — Cahier des Charges Fonctionnel Complet

**Version :** 1.0 Finale Consolidée
**Date :** 30 Juin 2026

---

# Table des matières

1. Vision du projet
2. Architecture technique
3. Architecture fonctionnelle
4. Modules du système
5. Gestion des rôles et permissions
6. Applications mobiles

   - Tarhib Employee
   - Tarhib Operations

7. Gestion des commandes
8. Gestion des quotas
9. Gestion du stock
10. Gestion des salles de réunion
11. Catalogue produits
12. Rapports & Analytics
13. Paramètres système
14. Authentification & Sécurité
15. Internationalisation
16. Design System
17. Police de caractères
18. Contraintes fonctionnelles
19. Évolutions futures

---

# 1. Vision du projet

Tarhib est une plateforme professionnelle de gestion d'hospitalité destinée aux entreprises.

Elle permet aux prestataires de gérer :

- les commandes de repas
- les pauses café
- les services internes
- les réservations de salles
- les stocks
- les achats
- les quotas employés

L'architecture est entièrement **modulaire**, permettant d'activer uniquement les fonctionnalités nécessaires selon le rôle de chaque utilisateur.

Deux applications mobiles distinctes sont prévues :

- **Tarhib Employee** : destinée aux employés des entreprises clientes.
- **Tarhib Operations (Pro)** : destinée au personnel interne Tarhib.

---

# 2. Architecture technique

## Backend

- NestJS
- PostgreSQL
- Redis
- Keycloak

## Web Admin

- React
- Ant Design

## Mobile

Deux applications Flutter indépendantes :

- Tarhib Employee
- Tarhib Operations

---

# 3. Architecture fonctionnelle

Le système est organisé autour de modules totalement indépendants.

Chaque module peut être :

- activé
- désactivé
- attribué à un rôle
- ajouté à un utilisateur individuellement

Le système doit permettre une très grande flexibilité dans la gestion des permissions.

---

# 4. Modules du système

## Auth & Utilisateurs

Gestion :

- utilisateurs
- invitations
- authentification
- sessions
- profils

---

## Rôles & Permissions

Création de :

- rôles internes
- rôles clients

Gestion des permissions par module.

---

## Sociétés & Branches

Gestion multi-tenant.

Chaque société possède :

- plusieurs branches
- plusieurs employés
- plusieurs salles
- plusieurs quotas

---

## Catalogue Produits

Gestion de :

- catégories
- produits
- images
- descriptions
- allergènes
- informations nutritionnelles
- disponibilité

---

## Stock & Inventaire

Gestion de trois niveaux :

1. Cuisine
2. Entrepôt Branche
3. Entrepôt Central

Fonctionnalités :

- entrées
- sorties
- transferts
- seuil minimum
- alertes
- historique

---

## Commandes

Gestion complète :

- panier
- validation
- préparation
- livraison
- historique

---

## Quotas

Configuration des quotas :

- par société
- par rôle client
- par produit
- par période

---

## Salles & Services

Gestion :

- salles
- capacités
- équipements
- réservations
- packages

---

## Fournisseurs & Achats

Gestion :

- fournisseurs
- bons de commande
- réceptions
- historiques

---

## Rapports & Analytics

Statistiques :

- commandes
- produits
- stocks
- SLA
- quotas

---

## Paramètres Système

Configuration globale :

- seuils
- stock
- notifications
- modules
- paramètres métier

---

# 5. Gestion des rôles et permissions

## Principe

Le système est entièrement modulaire.

Un utilisateur possède :

- un rôle principal
- zéro ou plusieurs modules supplémentaires

Le Super Admin peut créer un nombre illimité de rôles.

---

## Rôles internes par défaut

### Directeur Général (Super Admin)

Accès complet.

---

### Sous-Directeur / Admin Branche

Accès à tous les modules de sa branche.

---

### Manager Hospitalité / Ménage

Accès :

- Commandes
- Rapports
- Consultation Stock

---

### Cuisinier

Accès :

- Préparation des commandes
- Stock Cuisine

---

### Livreur

Accès :

- Livraison
- Validation de livraison

---

### Responsable Stock

Accès :

- Stock complet
- Inventaire
- Transferts

---

### Responsable Achats

Accès :

- Fournisseurs
- Achats
- Consultation Stock

---

## Attribution flexible

Exemple :

Un utilisateur peut avoir :

- rôle Cuisinier
- module Rapports
- module Stock

sans changer son rôle principal.

---

# 6. Rôles clients

Créés par :

- Super Admin
- Admin Branche

Chaque rôle peut disposer de :

- quotas activés ou non
- produits autorisés
- salles accessibles

Les modules accessibles sont limités à :

- Catalogue
- Commandes
- Salles de réunion

---

# 7. Application Mobile — Tarhib Employee

## Public

Employés des entreprises clientes.

---

## Catalogue

Affichage :

- grille 2 colonnes
- recherche AR / EN
- filtres catégories

Chaque carte contient :

- photo
- nom
- quota restant
- disponibilité

Statuts :

- Disponible
- Stock limité
- Indisponible

---

## Détail Produit

Affichage :

- grande photo
- nom arabe
- nom anglais
- description
- allergènes
- nutrition
- quota restant
- barre de progression
- état du stock
- quantité
- Ajouter au panier

---

## Panier

Fonctionnalités :

- modifier quantité
- supprimer article
- commentaire libre
- résumé
- confirmation

---

## Confirmation

Après validation :

redirection automatique vers le suivi.

---

## Suivi de commande

Étapes :

Commande Confirmée

↓

En Préparation

↓

Prête

↓

Livrée

Le suivi est mis à jour en temps réel.

Animation demandée :

**verre qui se remplit progressivement**

Aucun SLA.

Aucune priorité.

---

## Mes commandes

Fonctionnalités :

- historique
- filtre
- détail
- raison de rejet
- recommander

---

## Réservation de salles

Liste des salles :

- capacité
- équipements
- disponibilité

Réservation :

- date
- heure
- durée
- participants

Packages :

- Petit déjeuner
- Déjeuner
- Custom

Gestion :

- historique
- annulation

---

## Profil

Fonctionnalités :

- informations personnelles
- langue
- RTL/LTR
- thème clair/sombre
- déconnexion

---

# 8. Application Mobile — Tarhib Operations

## Public

Personnel interne Tarhib.

---

## File d'attente

Liste des commandes.

Tri :

- SLA
- priorité
- branche

Filtres :

- statut
- priorité
- société

Actions groupées disponibles.

---

## Détail commande

### Cuisinier

Peut :

- démarrer préparation
- marquer prête
- signaler rupture

---

### Livreur

Peut :

- marquer livrée

Aucune photo de livraison.

---

## Gestion Stock

Onglets :

Cuisine

Entrepôt Branche

Libre-Service VIP

Affichage :

- quantité
- seuil
- statut

Actions :

- entrée
- sortie
- transfert

Alertes visibles.

---

## Dashboard Manager

Indicateurs :

- commandes du jour
- commandes en attente
- SLA moyen
- top produits

Graphiques d'évolution.

Alertes critiques.

---

## Profil

Paramètres :

- stock
- seuils
- modules
- rôles

---

# 9. Gestion des commandes

Cycle complet :

Nouvelle commande

↓

Confirmée

↓

Préparation

↓

Prête

↓

Livrée

Gestion :

- commentaires
- historique
- notifications
- temps réel

---

# 10. Gestion des quotas

Configuration :

- société
- branche
- rôle client
- produit

Possibilité :

- quota journalier
- hebdomadaire
- mensuel

Affichage du quota restant dans l'application Employee.

---

# 11. Gestion du stock

Architecture :

Entrepôt Central

↓

Entrepôt Branche

↓

Cuisine

Une rupture en branche rend immédiatement le produit indisponible côté client.

Toutes les opérations doivent être historisées.

---

# 12. Gestion des salles

Fonctionnalités :

- calendrier
- disponibilité
- équipements
- réservations
- packages

Packages disponibles :

- Petit déjeuner + service
- Déjeuner + service
- Custom

---

# 13. Rapports & Analytics

Rapports :

- commandes
- ventes
- consommation
- quotas
- stocks
- SLA

Graphiques :

- évolution
- top produits
- tendances

---

# 14. Paramètres système

Gestion :

- modules
- notifications
- paramètres métier
- seuils
- langues
- thèmes

---

# 15. Authentification & Sécurité

Authentification via Keycloak.

Fonctionnalités :

- SSO
- JWT
- RBAC
- permissions par module
- multi-tenant

---

# 16. Internationalisation

Langues :

- Français
- Anglais
- Arabe

Support :

- RTL
- LTR

Changement instantané.

---

# 17. Design System

Interfaces modernes.

Technologies :

- Flutter Material 3
- React + Ant Design

Thèmes :

- clair
- sombre

Design responsive.

---

# 18. Police de caractères

Police principale :

**Thmanyah**

Contraintes de licence :

- ne pas redistribuer
- ne pas modifier
- ne pas permettre l'extraction
- ne pas vendre séparément

---

# 19. Contraintes fonctionnelles

Le système doit :

- être entièrement modulaire
- être multi-tenant
- fonctionner en temps réel
- permettre une gestion fine des permissions
- être évolutif
- être sécurisé
- être performant

---

# 20. Évolutions futures

Le projet est conçu pour intégrer facilement de nouveaux modules :

- Facturation
- Paiements
- CRM
- Fidélité
- IA pour prévision des stocks
- Tableaux de bord avancés
- Notifications intelligentes
- API publiques
- Intégrations ERP
- Intégrations RH

---

# Résumé

Tarhib est une plateforme d'hospitalité corporate moderne, modulaire et multi-tenant permettant :

- la gestion des commandes,
- la gestion des stocks,
- la gestion des salles,
- la gestion des quotas,
- la gestion des achats,
- l'administration complète des entreprises clientes,
- deux applications mobiles spécialisées (Employee & Operations),
- une administration centralisée avec un système avancé de rôles et permissions.

Ce document constitue la base fonctionnelle complète du projet et peut servir de référence unique pour le développement, la conception de la base de données, les API, les interfaces utilisateur et la planification des futures évolutions.
