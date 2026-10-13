# Guide — Mise en place du Backlog Jira (Epics, User Stories, Sprints) via MCP + Claude Code

**Objectif :** utiliser Claude Code, connecté à Jira via le serveur MCP Atlassian, pour générer et peupler automatiquement le backlog complet du projet (Epics → User Stories → Sprints) à partir des documents déjà produits (`Fiche_Fonctionnelle_Plateforme_Hospitalite.md`, `Guide_Implementation.md`, `Guide_MVP.md`, `CLAUDE.md`).

---

## 1. Connexion de Jira à Claude Code (MCP)

Atlassian propose un serveur MCP officiel, distant, authentifié en OAuth — c'est l'option recommandée (stable, pas de token à gérer manuellement, partenariat officiel avec Claude annoncé en GA début 2026).

### Étape 1 — Ajouter le serveur MCP
Dans le terminal, à la racine de ton projet (ou en portée utilisateur si tu veux qu'il soit dispo partout) :

```bash
# Portée projet (partagée avec l'équipe via .mcp.json versionné)
claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse --scope project

# OU portée utilisateur (disponible sur toutes tes sessions Claude Code)
claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse --scope user
```

### Étape 2 — Authentification
Lance `claude`, puis dans la session :
```
/mcp
```
Sélectionne le serveur `atlassian` → un flux OAuth s'ouvre dans le navigateur → connecte-toi avec ton compte Atlassian → autorise l'accès aux sites/projets souhaités.

### Étape 3 — Vérification
```bash
claude mcp list
```
Tu dois voir `atlassian` listé. Dans une session Claude Code, teste avec :
```
Liste les projets Jira auxquels j'ai accès.
```

> ⚠️ Le SSE Atlassian a eu des soucis de stabilité/ré-authentification fréquente rapportés par la communauté. Si tu rencontres des déconnexions répétées, l'alternative est `mcp-atlassian` (serveur self-hosté via Docker, auth par token API) — plus de setup mais plus stable en usage intensif. Vérifie dans tous les cas la documentation à jour sur `docs.claude.com` au moment de la mise en place, ces intégrations évoluent vite.

### Étape 4 — Créer le projet Jira (si pas déjà fait)
Le plus simple : crée le projet directement dans l'UI Jira (type **Scrum**, pour avoir la notion de Sprint), avec les types d'issue standards : Epic, Story, Task, Bug. Donne-lui une clé courte, ex. `TARHIB`. Claude Code n'a pas besoin de créer le projet lui-même — autant le faire une fois proprement à la main, puis laisser Claude peupler le contenu.

---

## 2. Structure cible du backlog

```text
Projet TARHIB
 └── Epics (≈ 1 par module métier de la Fiche Fonctionnelle)
      └── User Stories (1 fonctionnalité utilisateur testable)
           └── Sous-tâches techniques (optionnel, créées au moment du sprint planning)
```

### Convention de nommage
- **Epic** : `[MODULE] Nom du module` — ex. `[CMD] Commandes Employés`
- **Story** : verbe à l'infinitif + valeur utilisateur — ex. `En tant qu'Employé, je peux commander un produit disponible dans mon catalogue`
- **Label obligatoire par story** : le rôle concerné (`employe`, `agent-hospitalite`, `admin`, `manager`) + la phase (`mvp`, `v2`)

### Template de User Story (à faire respecter par Claude Code)

```text
Titre : En tant que [rôle], je peux [action], afin de [bénéfice]

Description :
- Contexte fonctionnel (référence au module de la Fiche Fonctionnelle)
- Règles métier applicables (référence au CLAUDE.md si pertinent, ex. moteur de validation)

Critères d'acceptation (format Gherkin recommandé) :
  Given ...
  When ...
  Then ...

Definition of Done :
- [ ] Code revu et mergé
- [ ] Tests unitaires/intégration passants
- [ ] Traduction AR/EN présente
- [ ] Testé en RTL si écran concerné
```

---

## 3. Liste des Epics du projet complet (mappés sur la Fiche Fonctionnelle)

| Epic | Modules sources | Phase |
|---|---|---|
| [AUTH] Authentification & Sécurité | Module 1 | MVP (basique) puis V2 (MFA, SSO) |
| [ORG] Gestion Société/Branche/Département/Employé | Modules 2-5 | MVP |
| [PROD] Gestion des Produits | Module 6 | MVP (commandable) + V2 (libre-service VIP) |
| [FOURN] Gestion des Fournisseurs | Module 7 | V2 |
| [ACHAT] Procurement / Achats | Module 8 | V2 |
| [STOCK] Gestion des Stocks | Module 9 | MVP (par branche) + V2 (emplacements VIP) |
| [TRANSF] Transferts Inter-Branches | Module 10 | V2 |
| [CMD] Commandes Employés + Moteur de Validation | Module 11 | MVP |
| [PRIO] Priorité & SLA | Module 12 | V2 |
| [QUOTA] Gestion des Quotas | Module 13 | MVP |
| [SALLE] Salles de Réunion | Module 14 | V2 |
| [CUISINE] Opérations Cuisine | Module 15 | V2 (file simple en MVP, intégrée à [CMD]) |
| [LIVR] Gestion des Livraisons | Module 16 | V2 |
| [SERV] Service Hospitalité sur Site + Réappro VIP | Module 17 | V2 |
| [NOTIF] Centre de Notifications | Module 18 | MVP (basique) + V2 (canaux multiples) |
| [RAPPORT] Rapports & Analytique | Module 19 | V2 (export CSV simple en MVP) |
| [DASH] Tableaux de Bord | Module 20 | V2 |
| [I18N] Support Multilingue AR/EN/RTL | Module 21 | MVP (transverse, dès le départ) |
| [AUDIT] Audit & Conformité | Module 22 | V2 (logs basiques en MVP) |

---

## 4. Génération du backlog avec Claude Code — méthode pas à pas

### 4.1 Préparer le contexte
Place les documents déjà produits (`Fiche_Fonctionnelle_Plateforme_Hospitalite.md`, `Guide_MVP.md`, `Guide_Implementation.md`, `CLAUDE.md`) dans le repo, à la racine ou dans `/docs`. Claude Code les lira pour générer du contenu cohérent avec ce qui a déjà été défini.

### 4.2 Créer les Epics
Exemple de prompt à donner à Claude Code dans une session, une fois le repo ouvert et le MCP Atlassian connecté :

```
Lis Fiche_Fonctionnelle_Plateforme_Hospitalite.md et CLAUDE.md.
Crée dans le projet Jira TARHIB un Epic par module métier, en suivant
exactement la liste et le mapping du fichier Guide_Jira_MCP.md section 3
(nom, description courte référencant le module, label de phase mvp/v2).
Ne crée pas encore les User Stories, seulement les Epics.
Affiche-moi la liste des Epics créés avec leur clé Jira à la fin.
```

### 4.3 Créer les User Stories par Epic
Faire epic par epic plutôt qu'en une seule passe géante (plus fiable, plus facile à corriger) :

```
Sur l'Epic TARHIB-12 [CMD] Commandes Employés :
Génère les User Stories nécessaires pour couvrir le Module 11 de
Fiche_Fonctionnelle_Plateforme_Hospitalite.md ET la logique détaillée
dans Parcours_Employe_Agent_Hospitalite.md (catalogue, panier,
moteur de validation, suivi de commande).
Respecte le template de story décrit dans Guide_Jira_MCP.md section 2
(titre, description, critères d'acceptation Gherkin, DoD).
Ajoute les labels de rôle et de phase appropriés.
Rattache chaque story à l'Epic TARHIB-12.
```

Répéter pour chaque Epic du tableau §3. Pour les Epics V2 volumineux (Stock, Procurement, Salles de réunion...), demander explicitement la séparation MVP/V2 si le module a des deux : ex. pour [STOCK], générer d'abord les stories MVP (stock par branche), puis dans une passe séparée les stories V2 (emplacements VIP, réappro).

### 4.4 Vérification et nettoyage
```
Liste toutes les stories du projet TARHIB sans Epic parent, ou sans label
de rôle, ou sans critères d'acceptation. Je veux corriger les oublis
avant de planifier les sprints.
```

### 4.5 Création des Sprints et planification
Une fois le backlog peuplé et propre :

```
Crée les sprints suivants dans le board Scrum du projet TARHIB, sprints
de 2 semaines, en respectant le découpage du Guide_MVP.md section 5 :
Sprint 1 à 6 avec les noms et objectifs donnés dans le tableau.
Pour chaque sprint, assigne les stories du backlog TARHIB qui correspondent
à son contenu (se baser sur les labels mvp + le module concerné).
Ne mets dans le Sprint 1 que les stories de [ORG] et [AUTH] strictement
nécessaires au socle technique.
```

> Conseil : valide manuellement l'affectation après cette étape — un agent peut bien proposer un découpage, mais la priorisation fine (dépendances techniques réelles, disponibilité de l'équipe) reste une décision humaine.

### 4.6 Itération
Pour le backlog V2 (modules non couverts par le MVP), répéter les étapes 4.3 à 4.5 plus tard, une fois le MVP livré — pas besoin de tout planifier en sprints dès maintenant, seul le backlog Epics + Stories V2 doit exister pour qu'il soit visible et estimable.

---

## 5. Bonnes pratiques pour cette génération assistée

- **Une commande = un epic ou un petit groupe de stories.** Éviter de demander "crée tout le backlog en une fois" : les sessions longues avec beaucoup d'appels MCP sont plus sujettes à erreurs/timeouts, et plus dures à corriger si Claude se trompe sur un epic.
- **Demander systématiquement un récapitulatif** (liste des clés créées) à la fin de chaque commande, pour pouvoir vérifier dans Jira avant de continuer.
- **Ne pas laisser Claude Code inventer des règles métier non documentées.** S'il manque un détail (ex. SLA exact d'une priorité), il doit te le demander plutôt que de l'inventer — rappelle-le explicitement dans le prompt si besoin : *"Si une information métier manque dans les documents, demande-moi plutôt que de supposer."*
- **Garder le CLAUDE.md à jour** au fur et à mesure que le backlog se construit : si une story Jira révèle une règle métier qui n'était pas encore écrite, reporter cette règle dans `CLAUDE.md` pour que le code généré plus tard la respecte aussi.
- **JQL ciblé plutôt que requêtes larges** une fois le backlog en place, pour éviter la lenteur/timeout signalés sur de grosses recherches Jira (ex. demander "mes tickets du sprint en cours dans TARHIB" plutôt que "tous les tickets Jira").

---

## 6. Résumé du flux complet

```text
Documents déjà produits (Fiche Fonctionnelle, Guide MVP, Guide Implémentation, CLAUDE.md)
        │
        ▼
Claude Code (MCP Atlassian connecté)
        │
        ├── Crée les Epics (1 par module)
        ├── Crée les User Stories par Epic (avec critères d'acceptation)
        ├── Crée les Sprints (alignés sur le phasage du Guide MVP / Guide Implémentation)
        └── Affecte les stories aux sprints
        │
        ▼
Backlog Jira complet, prêt pour le sprint planning humain (priorisation finale, estimation)
```
