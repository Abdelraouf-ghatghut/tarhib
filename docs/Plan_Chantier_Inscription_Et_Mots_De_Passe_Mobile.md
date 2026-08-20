# Plan de chantier — inscription Employee et mots de passe Operations

**Date :** 18 août 2026
**Applications :** Tarhib Employee, Tarhib Operations et Web Admin
**Dépendances :** NestJS, PostgreSQL, Redis, Keycloak, Expo / React Native

## Avancement de l'implémentation

### Lot 1 — socle d'inscription par entreprise : démarré le 19 août 2026

- [x] modes `CLOSED`, `APPROVAL_REQUIRED`, `AUTO_APPROVED` et `INVITE_ONLY` ;
- [x] code d'inscription distinct du slug, rotatif et stocké uniquement sous forme de HMAC ;
- [x] publication contrôlée des combinaisons branche/département/rôle client ;
- [x] validation serveur de l'appartenance au tenant et de la cohérence département/branche ;
- [x] résolution publique limitée en débit avec challenge opaque valable dix minutes ;
- [x] migration PostgreSQL `CompanySelfRegistration1786600000000` ;
- [x] tests unitaires du code rotatif, du challenge et du refus des entreprises fermées ;
- [x] écran Web Admin de configuration du mode, du code et des choix publiés ;
- [x] soumission Employee sans mot de passe anticipé ;
- [x] approbation transformée en émission d'un code d'activation à usage unique ;
- [x] émission directe du code d'activation en mode automatique ;
- [x] premier parcours mobile arabe RTL : code, entreprise, affectation, identité et résultat ;
- [x] vérification OTP dédiée avant la soumission, avec preuve opaque à usage unique ;
- [x] écran Web Admin des demandes affichant l'affectation demandée et la préremplissant à l'approbation ;
- [ ] tests E2E du cycle `PENDING → INVITED → ACTIVE`.

Le mot de passe n'est désormais collecté qu'avec le code d'activation, juste
avant la création du compte Keycloak. La mise en production reste conditionnée
aux réglages Web Admin et aux tests E2E du cycle complet.

### Lot 2 — cycle de mot de passe Operations : implémenté le 20 août 2026

- [x] indicateur persistant `mustChangePassword` sur les employés internes ;
- [x] propagation de l'indicateur dans le jeton et le profil d'accès mis en cache ;
- [x] blocage global des API métier tant que le changement obligatoire n'est pas effectué ;
- [x] changement du mot de passe par l'employé avec vérification du mot de passe actuel ;
- [x] règle minimale de douze caractères pour Operations ;
- [x] révocation des sessions Keycloak après changement ou réinitialisation ;
- [x] oubli de mot de passe et suppression de l'obligation après réinitialisation réussie ;
- [x] réinitialisation déclenchée par un administrateur autorisé, avec contrôle du périmètre et audit ;
- [x] écran mobile arabe RTL obligatoire avant tout accès aux missions ;
- [x] action et indicateur d'état dans la liste Web Admin des employés internes ;
- [x] écran facultatif « changement de mot de passe » dans le profil Operations ;
- [x] tests unitaires et d'intégration des contrôleurs, gardes et services d'authentification ;
- [ ] tests E2E Keycloak et recette physique Android/iOS.

## 1. Objectifs et décisions

Le chantier livre deux parcours distincts :

1. un employé d'une entreprise cliente peut demander son inscription dans Tarhib Employee avec un code entreprise défini depuis le Web Admin ;
2. un employé interne Tarhib peut activer son compte Operations, changer obligatoirement son mot de passe à la première connexion, le changer ensuite lui-même et demander une réinitialisation ; un administrateur autorisé peut également déclencher une réinitialisation.

Décisions structurantes :

- le `slug` reste l'identifiant lisible de l'entreprise, mais ne doit pas être considéré comme un secret ;
- chaque entreprise reçoit un `registrationCode` distinct, aléatoire, révocable et rotatif, stocké uniquement sous forme de hachage ;
- une entreprise choisit un mode d'inscription : `CLOSED`, `APPROVAL_REQUIRED`, `AUTO_APPROVED` ou `INVITE_ONLY` ;
- en mode `APPROVAL_REQUIRED`, aucune inscription Employee ne crée un compte actif avant validation administrative ;
- en mode `AUTO_APPROVED`, un code entreprise valide, un contact vérifié et un profil conforme déclenchent l'inscription et l'activation immédiates avec la branche, le département et le rôle choisis par l'employé parmi les options d'auto-inscription explicitement publiées par l'entreprise ;
- aucun mot de passe en clair ne doit être conservé dans PostgreSQL, Redis, les journaux, les notifications ou les audits ;
- une première connexion Operations ne donne aucun accès métier tant que le mot de passe initial n'a pas été remplacé ;
- les administrateurs déclenchent une activation ou une réinitialisation, mais ne doivent pas connaître le mot de passe définitif de l'employé ;
- tous les libellés mobiles sont en arabe et l'interface est RTL ; l'anglais reste disponible seulement si la politique mobile générale le conserve.

## 2. État existant réutilisable

Le socle contient déjà :

- `companies.slug`, unique et administrable depuis le Web Admin ;
- `POST /auth/register` avec `companySlug` ;
- le statut employé `PENDING` ;
- la liste Web Admin des inscriptions en attente ;
- l'approbation et le rejet d'une inscription ;
- l'invitation par code et `POST /auth/accept-invite` ;
- les services Keycloak de création et de réinitialisation de mot de passe ;
- les écrans partagés de connexion et d'acceptation d'invitation.

La dette P0 de stockage temporaire du mot de passe d'inscription dans Redis a été supprimée : le nouveau parcours ne collecte le mot de passe qu'au moment de l'activation, après approbation.

## 3. Parcours Employee cible

### 3.1 Écrans mobiles

1. **Connexion** — action secondaire `إنشاء حساب`.
2. **Code entreprise** — saisie du code, validation et affichage du nom de l'entreprise.
3. **Identité** — nom arabe, nom anglais facultatif, email professionnel et téléphone.
4. **Affectation demandée** — choix successif de la branche, du département puis du rôle parmi les options autorisées par l'entreprise.
5. **Vérification** — OTP email ou téléphone selon le canal activé.
6. **Traitement selon le mode** — attente `قيد المراجعة` sans collecte de mot de passe en mode approbation ; passage direct à la création du mot de passe en mode automatique.
7. **Mot de passe** — création et confirmation immédiatement en mode automatique, ou seulement après réception du code d'activation consécutif à l'approbation.
8. **Succès** — connexion automatique après activation.

Le bouton principal reste dans la zone basse accessible au pouce. Chaque écran couvre chargement, erreur, code expiré, hors ligne et succès.

### 3.2 Cycle métier

```text
Code entreprise valide
→ identité vérifiée
→ choix d'une branche autorisée
→ choix d'un département appartenant à cette branche
→ choix d'un rôle client autorisé pour cette branche/département
→ contact vérifié
→ lecture du mode d'inscription

APPROVAL_REQUIRED
  → demande PENDING
  → approbation admin, avec confirmation ou correction de la branche, du département et du rôle demandés
  → code d'activation à usage unique
  → définition du mot de passe
  → création/activation Keycloak
  → statut ACTIVE
  → connexion Employee

AUTO_APPROVED
  → revalidation serveur de la combinaison branche/département/rôle sélectionnée
  → définition du mot de passe
  → création/activation Keycloak dans une transaction compensable
  → statut ACTIVE
  → journal d'audit + notification administrative
  → connexion Employee immédiate
```

Le refus produit un état `REJECTED` avec un motif public facultatif, sans exposer de données administratives.

### 3.3 Administration de l'entreprise

Dans la fiche société du Web Admin, ajouter une section `إعدادات تسجيل الموظفين` :

- mode d'inscription ;
- branches ouvertes à l'auto-inscription ;
- départements ouverts à l'auto-inscription pour chaque branche ;
- rôles clients sélectionnables pour chaque branche/département ;
- rôle, branche et département de repli facultatifs pour les invitations administratives ;
- génération du code entreprise ;
- affichage du code uniquement au moment de sa création ou rotation ;
- copie du code ;
- rotation immédiate ;
- date de dernière rotation ;
- révocation ;
- durée de validité optionnelle ;
- domaines email autorisés facultatifs ;
- nombre de demandes récentes et alertes d'abus.

Le Web Admin interdit l'activation du mode `AUTO_APPROVED` tant qu'aucune combinaison branche/département/rôle n'est publiée. Le mode automatique ne peut attribuer ni rôle interne Tarhib, ni permission administrative, ni rôle additionnel. Une combinaison devient immédiatement non sélectionnable si la branche, le département ou le rôle est désactivé.

Dans l'application, les choix sont dépendants : la branche filtre les départements, puis le département et la branche filtrent les rôles. L'employé ne saisit jamais un identifiant libre et ne peut pas envoyer une combinaison non proposée par le serveur.

La rotation invalide uniquement les nouvelles demandes ; elle ne désactive pas les comptes existants.

## 4. Parcours Operations cible

### 4.1 Création ou réinitialisation administrative

L'administrateur crée l'employé interne, lui attribue son rôle, sa branche et son périmètre, puis choisit `إرسال دعوة التفعيل`.

Le système envoie un code d'activation à durée limitée. Si un mot de passe initial est utilisé pour des raisons opérationnelles, il est généré aléatoirement, communiqué par un canal contrôlé et marqué `mustChangePassword=true`.

### 4.2 Première connexion obligatoire

```text
Email + mot de passe initial
→ validation des identifiants
→ réponse PASSWORD_CHANGE_REQUIRED
→ écran plein « تغيير كلمة المرور »
→ nouveau mot de passe + confirmation
→ révocation des anciennes sessions
→ émission d'une nouvelle session
→ accès Operations
```

Le jeton obtenu avant le changement est un jeton de défi court, limité au seul endpoint de changement de mot de passe. Il ne doit pas être un jeton d'accès métier.

### 4.3 Changement autonome

Dans le profil Operations, ajouter `تغيير كلمة المرور` :

- mot de passe actuel ;
- nouveau mot de passe ;
- confirmation ;
- indicateur progressif des exigences ;
- message de succès ;
- révocation optionnelle ou obligatoire des autres sessions.

### 4.4 Mot de passe oublié

Le parcours public utilise une réponse générique pour empêcher l'énumération des comptes :

```text
Email ou téléphone
→ message identique que le compte existe ou non
→ OTP/code ou lien court
→ nouveau mot de passe
→ révocation de toutes les sessions
→ notification de sécurité
```

### 4.5 Réinitialisation par un administrateur

Depuis la fiche de l'employé interne :

- action `إرسال رابط إعادة تعيين كلمة المرور` recommandée ;
- action de secours `إنشاء رمز تفعيل مؤقت` avec permission renforcée ;
- confirmation et motif obligatoire ;
- audit de l'auteur, de la cible, de l'heure, de l'adresse IP et du canal ;
- aucune valeur de mot de passe définitif dans l'audit ;
- révocation immédiate des sessions actives ;
- statut visible `في انتظار تغيير كلمة المرور`.

## 5. Modèle de données

### Entreprise

- `registration_mode` ;
- `registration_code_hash` ;
- `registration_code_rotated_at` ;
- `registration_code_expires_at` nullable ;
- `allowed_registration_email_domains` nullable ;
- `registration_enabled_by` et date d'activation.
- tables de publication des branches, départements et rôles autorisés à l'auto-inscription ;
- contraintes garantissant que le département appartient à la branche et que le rôle est de scope `CLIENT` pour l'entreprise ;
- `self_registration_default_branch_id`, `self_registration_default_department_id` et `self_registration_default_role_id` facultatifs pour les invitations et parcours administratifs.

### Employé

- `must_change_password` booléen ;
- `password_changed_at` nullable ;
- `credentials_reset_at` nullable ;
- `credentials_reset_by` nullable ;
- `activation_sent_at` nullable ;
- `activation_completed_at` nullable.

### Demande d'inscription

Créer une entité dédiée plutôt que d'utiliser directement un employé incomplet :

- identifiant opaque ;
- entreprise ;
- identité et contacts normalisés ;
- canal et date de vérification ;
- statut `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED` ;
- décision, motif public et audit ;
- aucune colonne de mot de passe.

Les codes, OTP et défis sont hachés dans Redis, à usage unique et avec TTL.

## 6. API cible

### Public Employee

- `POST /auth/company-registration/resolve` ;
- `GET /auth/company-registration/:challenge/options` pour retourner les branches, départements et rôles publiés sans exposer les autres référentiels de l'entreprise ;
- `POST /auth/registrations` ;
- `POST /auth/registrations/verify` ;
- `GET /auth/registrations/:reference/status` avec preuve opaque ;
- `POST /auth/registrations/activate`.

### Authentifié ou défi limité

- `POST /auth/password/first-login` ;
- `POST /auth/password/change` ;
- `POST /auth/password/forgot` ;
- `POST /auth/password/verify` ;
- `POST /auth/password/reset`.

### Administration

- `PATCH /companies/:id/registration-settings` ;
- `POST /companies/:id/registration-code/rotate` ;
- `POST /employees/:id/send-activation` ;
- `POST /employees/:id/password-reset` ;
- endpoints existants d'approbation/rejet adaptés à l'entité de demande.

Toutes les mutations sensibles utilisent rate limiting, idempotence, audit et messages d'erreur non énumérables.

## 7. Sécurité et règles de mot de passe

- minimum 12 caractères pour Operations ;
- contrôle par longueur et liste de mots de passe compromis plutôt que règles arbitraires trop complexes ;
- interdiction de réutiliser le mot de passe initial ;
- code entreprise limité en tentatives par IP/appareil et entreprise ;
- mode automatique limité par entreprise, IP, appareil, email et téléphone, avec seuil d'arrêt automatique et alerte administrateur ;
- email ou téléphone obligatoirement vérifié avant toute activation automatique ;
- domaine email autorisé appliqué avant activation lorsque l'entreprise l'a configuré ;
- branche, département et rôle sélectionnés revalidés dans une transaction au moment de l'activation ;
- rôle automatique obligatoirement publié, actif et de scope `CLIENT`, sans permission administrative ni rôle additionnel ;
- OTP et activation à usage unique, TTL court, compteur d'essais et invalidation après succès ;
- aucune donnée sensible dans Sentry, logs HTTP ou analytics ;
- révocation des refresh tokens après changement/reset ;
- événement de sécurité envoyé à l'utilisateur après changement ;
- permission distincte `employee.credentials.reset` pour l'administration ;
- réauthentification de l'admin avant une réinitialisation sensible.

## 8. Lots d'implémentation

| Lot                                        | Charge indicative | Livrable                                                             | Critère de sortie                               |
| ------------------------------------------ | ----------------: | -------------------------------------------------------------------- | ----------------------------------------------- |
| A — cadrage et contrats                    |           2 jours | décisions, maquettes de flux, OpenAPI et menaces                     | contrats validés par métier/sécurité            |
| B — base et sécurité                       |           4 jours | migrations, entités, codes hachés, suppression du mot de passe Redis | aucun secret en clair, tests de migration verts |
| C — inscription Employee backend/admin     |           5 jours | réglages société, demandes, approbation, activation                  | parcours API complet et audité                  |
| D — inscription Employee mobile            |           4 jours | écrans RTL, validation, attente et activation                        | recette Android/iOS nominale et erreurs         |
| E — mots de passe Operations backend/admin |           5 jours | première connexion, changement, oubli et reset admin                 | aucun accès métier avant changement obligatoire |
| F — mots de passe Operations mobile        |           3 jours | écrans première connexion/profil/reset                               | recette par employé et admin                    |
| G — durcissement et lancement              |           4 jours | E2E, charge, anti-abus, observabilité, runbook                       | zéro anomalie critique/majeure                  |

Charge totale indicative : **27 jours ouvrés**, parallélisable sur environ **4 semaines** avec un backend, un mobile, un Web Admin et un QA disponibles.

## 9. Ordre d'exécution

1. Valider `registrationCode` distinct du slug, les quatre modes d'inscription et la matrice des combinaisons branche/département/rôle publiées.
2. Écrire les contrats OpenAPI et la matrice de menaces.
3. Ajouter les migrations et supprimer le stockage du mot de passe dans `register()`.
4. Implémenter les réglages Web Admin de la société.
5. Implémenter le backend du parcours Employee et ses tests.
6. Implémenter les écrans Employee RTL et les états complets.
7. Implémenter `mustChangePassword`, le défi limité et la révocation de sessions.
8. Implémenter changement autonome, oubli et reset administratif.
9. Implémenter les écrans Operations et les permissions Web Admin.
10. Exécuter les E2E, la recette physique Android/iOS et un pilote staging.

## 10. Tests obligatoires

### Employee

- code valide, invalide, révoqué et expiré ;
- entreprise fermée ou sur invitation ;
- mode automatique avec choix parmi plusieurs branches, départements et rôles publiés ;
- filtrage des départements par branche et des rôles par combinaison ;
- refus d'activer le mode automatique lorsqu'aucune combinaison autorisée n'est publiée ;
- falsification d'un identifiant de branche, département ou rôle non proposé, refusée côté API ;
- désactivation concurrente d'un rôle entre l'affichage et l'activation, sans création de compte partiel ;
- activation automatique avec notification et audit ;
- concurrence de deux inscriptions automatiques avec le même email ou téléphone, sans double compte ;
- seuil anti-abus dépassé provoquant la suspension automatique du mode et une alerte ;
- doublon email/téléphone avec réponse non énumérable ;
- approbation, rejet et expiration ;
- code d'activation expiré ou réutilisé ;
- deux approbations concurrentes ;
- activation puis connexion dans la bonne entreprise uniquement.

### Operations

- compte initial bloqué hors écran de changement ;
- mot de passe actuel incorrect ;
- défi expiré ou réutilisé ;
- changement réussi et ancienne session révoquée ;
- oubli sur compte existant et inexistant avec réponse identique ;
- reset admin sans permission refusé ;
- reset admin avec audit et révocation ;
- utilisateur désactivé incapable d'utiliser un code encore valide.

### Non-régression

- invitations existantes ;
- login Employee et Operations ;
- OTP ;
- refresh/logout ;
- permissions et séparation CLIENT/TARHIB ;
- multi-tenant et limites de branche ;
- fonctionnement Android et iOS, RTL, mode hors ligne et reprise.

## 11. Déploiement progressif

1. migrations et endpoints inactifs derrière des feature flags ;
2. activation en préproduction ;
3. migration des invitations en attente sans mot de passe Redis ;
4. recette interne Tarhib Operations ;
5. pilote Employee en `APPROVAL_REQUIRED` sur une société et une branche ;
6. pilote `AUTO_APPROVED` sur une entreprise proposant plusieurs combinaisons branche/département/rôle client non privilégiées ;
7. activation progressive par entreprise ;
8. généralisation après métriques stables.

Feature flags recommandés :

- `MOBILE_EMPLOYEE_SELF_REGISTRATION_ENABLED` ;
- `OPERATIONS_FIRST_LOGIN_PASSWORD_CHANGE_ENABLED` ;
- `ADMIN_CREDENTIAL_RESET_ENABLED`.

## 12. Définition de terminé

- aucun mot de passe ou code brut persistant hors Keycloak ;
- l'entreprise contrôle explicitement son mode et son code d'inscription ;
- une demande Employee ne peut pas franchir le tenant sélectionné ;
- en mode contrôlé, l'administrateur confirme ou corrige la branche, le département et le rôle demandés avant activation ;
- en mode automatique, le système applique exclusivement la combinaison publiée choisie par l'employé et active directement le compte après revalidation serveur et vérification du contact ;
- un compte Operations initial n'accède à aucune mission avant changement ;
- l'employé peut changer et récupérer son mot de passe ;
- l'admin peut déclencher une réinitialisation autorisée et auditée ;
- tous les parcours critiques sont verts sur Android et iOS en préproduction ;
- sauvegarde, rollback, observabilité et support sont documentés.
