# Contexte de référence du projet Tarhib

**Dernière mise à jour :** 21 août 2026  
**Commit fonctionnel de référence :** `6b3dffd` — `feat: add mobile registration and operations password lifecycle`  
**Usage :** joindre ou faire lire ce document au début de chaque nouvelle discussion technique sur Tarhib.

> Ce document distingue volontairement quatre états : **implémenté dans le code**, **testé localement**, **déployé et confirmé**, et **à vérifier**. Une procédure proposée n'est jamais considérée comme réalisée tant qu'une sortie de commande ou une recette ne l'a pas confirmé.

## 1. Résumé exécutif

Tarhib est une plateforme d'hospitalité corporate multi-tenant comprenant :

- un backend NestJS ;
- PostgreSQL pour les données métier et Keycloak ;
- Redis pour le cache, les OTP, les défis et les mécanismes temporaires ;
- Keycloak pour l'identité et les sessions ;
- un Web Admin React/Ant Design ;
- Tarhib Employee, application Expo/React Native destinée aux employés clients ;
- Tarhib Operations, application Expo/React Native destinée au personnel Tarhib ;
- Caddy comme reverse proxy et gestionnaire TLS ;
- Docker Compose pour la production et la préproduction.

Les applications mobiles actives sont Expo/React Native, avec priorité à iOS tout en conservant Android. L'ancienne application Flutter est archivée et ne doit plus être développée.

## 2. Référentiels à lire

- `AGENTS.md` : cahier des charges fonctionnel consolidé ;
- `docs/Plan_Developpement_Implementation_Applications_Mobiles_Production.md` : couverture fonctionnelle et feuille de route mobile ;
- `docs/Plan_Chantier_Inscription_Et_Mots_De_Passe_Mobile.md` : inscription Employee et cycle des mots de passe Operations ;
- `docs/Audit_Applications_Mobiles_Par_Role.md` : couverture des rôles mobiles ;
- `docs/Audit_Pertinence_KPI_Web_Admin.md` : audit des KPI ;
- `docs/Guide_Utilisateur_Web_Admin_Complet.md` : guide utilisateur du Web Admin ;
- le présent document : état opérationnel et décisions effectivement prises.

En cas de contradiction, vérifier le code et les migrations avant de mettre à jour ce document.

## 3. Dépôt et branches

- Dépôt : `Abdelraouf-ghatghut/tarhib` ;
- branche de déploiement : `main` ;
- commit fonctionnel courant observé localement : `6b3dffd` ;
- commit précédent concernant EAS : `f7627ab` ;
- les polices Thmanyah binaires sont ignorées par Git ;
- aucun secret `.env.production` ou `.env.staging` ne doit être commité.

Commandes de contrôle avant toute intervention :

```bash
git status
git log -1 --oneline
git diff --check
```

Le commit `6b3dffd` contient 53 fichiers, environ 2 981 insertions, et couvre l'inscription mobile ainsi que le cycle des mots de passe Operations. Sa présence sur `origin/main` doit être vérifiée avant tout nouveau déploiement :

```bash
git fetch origin
git rev-parse --short HEAD
git rev-parse --short origin/main
```

## 4. Environnements

### 4.1 Production

- code : `/opt/tarhib` ;
- Compose principal : `docker-compose.prod.yml` ;
- extension réseau/reverse proxy utilisée lors de certains déploiements : `docker-compose.edge.yml` ;
- domaine Web Admin : `https://admin.tarhib.ly` ;
- API : `https://api.tarhib.ly` ;
- Keycloak : `https://auth.tarhib.ly` ;
- domaine racine : `https://tarhib.ly`, redirigé vers le Web Admin ;
- PostgreSQL, Redis, Keycloak, backend, Web Admin et Caddy sont conteneurisés ;
- pare-feu VPS : ports entrants 22, 80 et 443 ;
- Fail2Ban actif avec la jail `sshd` ;
- SSH root désactivé ; authentification SSH par clé ;
- sauvegardes PostgreSQL automatisées ;
- copies distantes chiffrées avec Restic vers Cloudflare R2 ;
- suivi de disponibilité API avec UptimeRobot ;
- supervision du job de sauvegarde avec Cronitor.

Derniers contrôles de production historiquement réussis :

- `https://api.tarhib.ly/health/live` ;
- `https://api.tarhib.ly/health/ready` avec PostgreSQL et Redis à `ok` ;
- `https://admin.tarhib.ly` en HTTP 200 ;
- `https://auth.tarhib.ly` répond via Caddy/Keycloak.

Ne pas supposer que ces contrôles sont encore verts : les relancer avant chaque déploiement.

### 4.2 Préproduction

- code : `/opt/tarhib-staging` ;
- Compose : `docker-compose.staging.yml` ;
- extension proxy : `docker-compose.staging.proxy.yml` ;
- projet Compose : `tarhib-staging` ;
- réseau : `tarhib-staging_internal` ;
- Web Admin : `https://staging-admin.tarhib.ly` ;
- API : `https://staging-api.tarhib.ly` ;
- Keycloak : `https://staging-auth.tarhib.ly` ;
- base métier attendue : `tarhib_staging` ;
- environnement mobile EAS Preview : `https://staging-api.tarhib.ly`.

La préproduction partage le VPS actuel mais doit rester isolée par :

- un projet Compose différent ;
- des volumes PostgreSQL et Redis différents ;
- un réseau Docker différent ;
- des secrets distincts ;
- une base Keycloak et un realm/configuration staging distincts ;
- des domaines staging distincts.

Ne jamais copier les secrets de production dans `.env.staging`.

## 5. Déploiement et migrations

Décisions :

- exécuter les migrations explicitement avant le nouveau backend ;
- utiliser `TYPEORM_MIGRATIONS_RUN: "false"` en staging et, idéalement, en production ;
- construire une image temporaire avec la cible Docker `build` pour disposer de TypeORM et TypeScript ;
- ne jamais lancer automatiquement `migration:revert` sur les migrations destructrices ;
- sauvegarder et vérifier PostgreSQL avant toute migration ;
- redémarrer uniquement les services applicatifs concernés.

Migrations récentes importantes :

- `1786550000000-MeetingPreparationTeams` ;
- `1786560000000-OperationalZones` ;
- `1786570000000-ProductAllergensNutrition` ;
- `1786580000000-KitchenPreparationChecklist` ;
- `1786590000000-DeliveryArrivalProof` ;
- `1786600000000-CompanySelfRegistration` ;
- `1786610000000-OperationsPasswordLifecycle`.

Les migrations `178660...` et `178661...` sont présentes dans le code. Leur exécution effective en staging doit être confirmée par la table `migrations` avant de poursuivre une recette :

```sql
SELECT id, name
FROM migrations
WHERE name IN (
  'CompanySelfRegistration1786600000000',
  'OperationsPasswordLifecycle1786610000000'
)
ORDER BY id;
```

## 6. Architecture fonctionnelle mobile

### 6.1 Tarhib Employee

Public : employés des entreprises clientes.

Fonctions implémentées ou déjà couvertes dans le plan :

- authentification et restauration de session ;
- catalogue, recherche, catégories et détail produit ;
- allergènes et informations nutritionnelles ;
- quotas et disponibilité ;
- panier et commandes ;
- suivi de commande ;
- historique, annulation et évaluation ;
- salles de réunion et réservation ;
- inscription par code entreprise ;
- sélection contrôlée de la branche, du département et du rôle client ;
- parcours mobile arabe RTL.

### 6.2 Tarhib Operations

Public : personnel interne Tarhib.

Fonctions implémentées ou déjà couvertes :

- file d'attente et détail des commandes ;
- cuisine, checklist et préparation ;
- responsable de préparation et équipe participante ;
- livraison avec affectation par zones/étages ;
- file hors ligne de confirmation de livraison ;
- ménage avec zones attribuées ;
- stock, transferts, demandes de réapprovisionnement et achats ;
- salles et préparations de réunions ;
- incidents et notifications ;
- profil ;
- changement obligatoire du mot de passe initial ;
- changement volontaire du mot de passe depuis le profil.

Décisions métier :

- un livreur reçoit une ou plusieurs zones/étages ;
- les missions de ménage sont affectées par zone ;
- une préparation de réunion possède un responsable qui constitue l'équipe participante ;
- les interfaces mobiles sont en arabe RTL pour le périmètre actuellement demandé ;
- les deux applications doivent rester compatibles Android et surtout iOS.

## 7. Inscription Employee par entreprise

Implémenté dans le commit `6b3dffd` :

- modes `CLOSED`, `APPROVAL_REQUIRED`, `AUTO_APPROVED`, `INVITE_ONLY` ;
- code d'inscription distinct du slug ;
- code rotatif stocké uniquement sous forme de HMAC ;
- challenge public opaque avec durée de vie limitée ;
- validation OTP dédiée ;
- publication de combinaisons branche/département/rôle ;
- validation serveur du tenant et des relations ;
- écran Web Admin de configuration ;
- écran Web Admin des demandes ;
- parcours Employee arabe RTL ;
- suppression du stockage anticipé du mot de passe dans Redis ;
- activation par code à usage unique.

Règles :

- le slug n'est pas un secret ;
- le code d'inscription est un secret rotatif ;
- aucun mot de passe en clair dans PostgreSQL, Redis, les logs ou les audits ;
- `AUTO_APPROVED` exige au moins une combinaison publiée ;
- seuls les rôles `CLIENT` valides peuvent être publiés ;
- le département doit appartenir à la branche ;
- la branche doit appartenir à l'entreprise ;
- une combinaison dupliquée est refusée.

Erreurs métier possibles sur `PATCH /companies/:id/registration-settings` :

- `registrationOptionsRequired` ;
- `duplicateRegistrationOption` ;
- `branchNotFoundForCompany` ;
- `departmentNotFoundForBranch` ;
- `roleNotFoundForCompany`.

### Incident staging ouvert

Le 20 août 2026, la requête suivante retourne encore HTTP 400 :

```text
PATCH /companies/6e19c0fa-7372-4564-ba38-476b9be378b7/registration-settings
```

La réponse JSON exacte et le payload doivent être récupérés dans DevTools avant toute correction. Ne pas modifier le code sans connaître `response.message`.

## 8. Cycle des mots de passe Operations

Implémenté :

- colonne `employees.must_change_password` ;
- propagation dans le JWT et le profil d'accès en cache ;
- garde global bloquant les API métier avant changement ;
- exceptions limitées à l'identité, la déconnexion et le changement de mot de passe ;
- vérification du mot de passe actuel via Keycloak ;
- longueur minimale de 12 caractères ;
- révocation des sessions ;
- réinitialisation publique non énumérable ;
- réinitialisation administrative contrôlée par permission et périmètre ;
- audit de la réinitialisation ;
- écran obligatoire Operations arabe RTL ;
- écran volontaire depuis le profil ;
- état visible dans le Web Admin ;
- bouton de reset administratif.

Le Superadmin destiné uniquement au Web Admin peut être créé avec `must_change_password = false`, car l'écran obligatoire est actuellement intégré à Operations. Son mot de passe définitif fort doit être défini dans Keycloak staging.

## 9. Superadmin staging

Un Superadmin Tarhib doit exister à deux endroits :

1. utilisateur dans le realm Keycloak staging `tarhib` ;
2. employé PostgreSQL avec `scope = 'TARHIB'`, `company_id = NULL`, `branch_id = NULL`, rôle dynamique `Superadmin` et toutes les permissions.

Le compte bootstrap Keycloak n'est pas automatiquement un Superadmin Tarhib.

État actuel : une procédure SQL/Keycloak a été fournie, mais la création effective du compte staging n'a pas été confirmée dans la conversation. Vérifier avant de considérer cette étape terminée.

Contrôle attendu :

```sql
SELECT
  e.email,
  e.keycloak_id,
  e.scope,
  e.active,
  e.status,
  e.must_change_password,
  r.name_en AS role
FROM employees e
LEFT JOIN roles r ON r.id = e.role_id
WHERE e.email = 'ghatghut.abdelraouf@gmail.com';
```

## 10. Authentification et sécurité serveur

- Ubuntu 24.04 LTS ;
- utilisateur d'administration : `tarhibadmin` avec `sudo` ;
- `PermitRootLogin no` ;
- `PasswordAuthentication no` ;
- `PubkeyAuthentication yes` ;
- UFW entrant refusé par défaut ;
- ports 22, 80 et 443 autorisés ;
- trafic sortant autorisé ;
- Fail2Ban actif pour SSH ;
- protection VM activée côté fournisseur ;
- domaine protégé par Registrar Lock recommandé/activé selon contrôle du compte ;
- DNS A pour racine, `www`, `prod-01`, `api`, `admin`, `auth` ;
- domaines staging ajoutés au reverse proxy et au DNS ;
- DNSSEC ne doit être activé qu'après vérification complète de la chaîne DNS.

Les secrets contenant des caractères shell ne doivent pas être chargés avec :

```bash
source .env.production
source .env.staging
```

Utiliser `docker compose --env-file` et les variables déjà résolues dans les conteneurs.

## 11. Police Thmanyah et licence

Décisions :

- ne jamais commiter les fichiers de police ;
- `.woff2` ignorés par `.gitignore` ;
- les polices Web sont techniquement récupérables par le navigateur ;
- une restriction par `Referer`, CORS ou URL ne garantit pas la non-extraction ;
- demander une autorisation écrite si la licence exige une intégration emballée ou obscurcie ;
- pour les PDF, utiliser une police OTF/TTF montée uniquement dans le backend ;
- le dossier privé recommandé est `/opt/tarhib-private/fonts` ;
- montage backend recommandé : `/opt/tarhib-private/fonts:/data/fonts:ro` ;
- variable : `PDF_FONT_AR_PATH=/data/fonts/<nom-regular>.otf`.

### État Web staging confirmé

- cinq fichiers `.woff2` ont été copiés dans `apps/web-admin/public/fonts/thmanyah` sur le serveur staging ;
- ils sont ignorés par Git ;
- le Web Admin staging a été reconstruit et recréé ;
- un accès direct sans `Referer` retourne HTTP 403 ;
- le test avec le `Referer` staging et la vérification DevTools restent à confirmer.

### Incident OTF staging ouvert

Le backend staging voit `/data/fonts`, mais retourne actuellement :

```text
ls: can't open '/data/fonts': Permission denied
ERREUR : police PDF inaccessible
```

Ne pas conclure que la police PDF fonctionne. Contrôler :

```bash
docker inspect tarhib-staging-backend-1 \
  --format '{{range .Mounts}}{{println .Type "|" .Source "|" .Destination "|" .Mode}}{{end}}'

sudo namei -l /opt/tarhib-private/fonts

docker compose \
  --env-file .env.staging \
  -f docker-compose.staging.yml \
  -f docker-compose.staging.proxy.yml \
  exec -T backend id
```

Puis tester en root dans le conteneur afin de distinguer montage et permissions.

## 12. Documents et contrats scannés

Implémenté précédemment :

- stockage des contrats scannés dans un volume backend ;
- champ `نسخة العقد` et action `اختيار الملف` ;
- présence dans les contrats RH et commerciaux ;
- lecteur intégré pour `عرض المستند` ;
- section `مستندات الشركة` dans les paramètres système ;
- répertoire backend attendu : `/data/contracts` ;
- variable : `CONTRACT_DOCUMENTS_DIR` ;
- volume persistant `contract_documents`.

Les documents persistants ne doivent jamais résider uniquement dans la couche écrivable du conteneur.

## 13. Sauvegardes

- script : `/opt/tarhib/scripts-prod/backup-postgres.sh` en production ;
- service systemd : `tarhib-postgres-backup.service` ;
- timer systemd actif ;
- sauvegardes locales PostgreSQL au format custom ;
- dépôt Restic sur Cloudflare R2 ;
- monitoring Cronitor du job quotidien ;
- les commandes Restic interactives doivent recevoir explicitement le repository et le fichier de mot de passe ou charger l'environnement de service ;
- tester périodiquement `pg_restore --list` et une restauration isolée.

Avant chaque migration staging ou production :

1. sauvegarder la base métier ;
2. sauvegarder Keycloak ;
3. vérifier les dumps avec `pg_restore --list` ;
4. enregistrer le commit et le tag de release.

## 14. CI, builds et qualité

Décisions et corrections déjà réalisées :

- Node 22 utilisé pour satisfaire Vite ;
- imports TypeScript/OpenAPI corrigés ;
- audit npm production corrigé ;
- ancien job Flutter archivé ;
- Expo Employee et Operations validés dans la CI ;
- polices Thmanyah exclues des bundles publics Git/CI lorsque la licence l'exige ;
- profils EAS `development`, `preview`, `production` ;
- `preview` pointe vers `https://staging-api.tarhib.ly` ;
- `production` pointe vers `https://api.tarhib.ly`.

Dernière validation locale confirmée pour le chantier `6b3dffd` :

- 60 suites backend réussies ;
- 502 tests backend réussis ;
- build backend réussi ;
- build Web Admin réussi ;
- typecheck mobile Operations réussi ;
- `git diff --check` réussi.

À vérifier après push : état réel de GitHub Actions sur `origin/main`.

## 15. État d'avancement honnête

### Terminé dans le code

- première étape de personnalisation de **نظرة عامة** selon les permissions effectives : les rapports, alertes de stock, commandes récentes et raccourcis métier ne sont plus affichés uniformément à tous les rôles ;
- widgets opérationnels spécialisés ajoutés à **نظرة عامة** pour la cuisine, la livraison, le ménage et la préparation des réunions, alimentés uniquement par les files autorisées de l'utilisateur ;
- filtrage backend renforcé pour les préparations de réunion : un exécutant ne voit que les missions dont il est responsable ou membre d'équipe ;
- menu latéral Web Admin réorganisé en groupes métier (accueil, opérations, entreprises et employés, inventaire, rapports, finance, comptabilité, RH, administration et sécurité), avec suppression automatique des rubriques vides ;
- quatre pages Web Admin de supervision opérationnelle ajoutées pour la cuisine, la livraison, le ménage et les préparations de réunion ; elles sont reliées au menu et aux raccourcis de **نظرة عامة**, tandis que les transitions terrain restent dans Tarhib Operations ;
- configuration d'interface persistante par rôle TARHIB ajoutée : sélection et ordre effectif des sections de **نظرة عامة**, sélection/ordre des pages du menu avec commandes haut/bas, toujours limitée par les permissions effectives ; migration `1786620000000-RoleAdminUiConfig` requise avant déploiement ;
- le formulaire de configuration d'interface ne propose que les widgets et pages compatibles avec les permissions actuellement sélectionnées et purge les références devenues incompatibles à l'enregistrement ;
- les configurations d'interface multi-rôles sont fusionnées sans doublons, avec priorité au rôle principal et enrichissement par les rôles supplémentaires ; un rôle non configuré conserve le comportement par défaut ;
- préréglages Web Admin disponibles pour direction, manager, cuisine, livraison, ménage, réunions, stock, achats, RH et finance, avec restauration des valeurs par défaut ;
- build et ESLint ciblé du Web Admin validés localement pour cette première étape ;
- fondation mobile de fiabilité ;
- catalogue Employee et fonctions principales ;
- cuisine, supervision, livraison et zones ;
- inscription Employee par entreprise ;
- cycle des mots de passe Operations ;
- réglages Web Admin associés ;
- tests unitaires et d'intégration locaux.

### Déployé ou observé en staging

- services staging et domaines disponibles ;
- Web Admin staging reconstruit avec les `.woff2` locales ;
- endpoint des réglages d'inscription atteint par le navigateur ;
- montage OTF déclaré mais non fonctionnel à cause d'une permission ;
- `PATCH registration-settings` atteint le backend mais retourne 400.

### Non confirmé ou restant

- présence de `6b3dffd` sur `origin/main` ;
- exécution confirmée des migrations `178660...` et `178661...` en staging ;
- création effective du Superadmin staging ;
- résolution du HTTP 400 sur les réglages d'inscription ;
- accès OTF du backend et génération réelle d'un PDF arabe ;
- recette E2E `PENDING → INVITED → ACTIVE` ;
- recette réelle Keycloak du changement/reset de mot de passe ;
- recette physique Android du nouveau chantier ;
- recette physique iOS ;
- pilote staging ;
- décision finale de mise en production.

## 16. Prochain ordre d'exécution recommandé

1. vérifier que `6b3dffd` est poussé et que la CI est verte ;
2. confirmer les deux migrations staging dans PostgreSQL ;
3. confirmer ou créer le Superadmin staging ;
4. récupérer le `Response` et le `Payload` exacts du PATCH HTTP 400 ;
5. corriger uniquement la cause identifiée ;
6. résoudre les permissions du montage OTF ;
7. générer et inspecter un PDF arabe staging ;
8. configurer une entreprise test et son code d'inscription ;
9. construire de nouveaux APK/IPA EAS Preview ;
10. exécuter les recettes Employee et Operations ;
11. tester sauvegarde et restauration staging ;
12. établir un Go/No-Go avant toute production.

## 17. Checklist de début d'une nouvelle discussion

Demander ou fournir ces sorties, sans secret :

```bash
git status
git log -1 --oneline
docker compose --env-file .env.staging \
  -f docker-compose.staging.yml \
  -f docker-compose.staging.proxy.yml ps
curl --fail --silent --show-error \
  https://staging-api.tarhib.ly/health/ready
```

Puis préciser :

- environnement concerné : local, staging ou production ;
- dernier commit réellement déployé ;
- migration concernée ;
- requête, payload et réponse exacte en cas d'erreur HTTP ;
- service et logs correspondants ;
- action attendue : diagnostic, correction, déploiement ou recette.

## 18. Règles de mise à jour de ce document

Après chaque chantier ou déploiement :

1. mettre à jour la date ;
2. inscrire le commit ;
3. déplacer chaque élément entre « terminé », « staging » et « restant » ;
4. ajouter les incidents ouverts avec leur message exact ;
5. retirer les incidents résolus en conservant la décision finale ;
6. ne jamais inscrire de mot de passe, token, clé SSH, clé R2, identifiant secret ou IP privée ;
7. valider avec `git diff --check` ;
8. commiter la mise à jour avec un message `docs:`.
