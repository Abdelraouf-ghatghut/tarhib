# Spécification fonctionnelle — Apps mobiles React Native & Portail Web Admin

**Périmètre :** `apps/mobile-employee`, `apps/mobile-operations`, `packages/mobile-shared`, `apps/web-admin`
**Statut :** reflète le code au 11 juillet 2026 (branche `feature/TARHIB-8-32-41-50-rtl-keycloak-stock`).
**Usage :** référence unique pour comprendre qui peut faire quoi, ce qui est affiché/masqué, et quel endpoint porte chaque action.

---

## Partie I — Socle commun aux deux apps mobiles (`packages/mobile-shared`)

Les deux apps partagent le même moteur : thème Snow UI, client API, store d'authentification,
écrans d'auth, socket temps réel. Seuls changent la couleur principale (**Employee = vert
`#55CFA8`**, **Operations = bleu `#5B8CFF`**), la langue par défaut (Employee = **arabe**,
Operations = anglais) et le contenu après connexion.

### I.1 Démarrage de l'app

1. **Splash screen** (logo + nom de l'app) pendant `restoreSession()` :
   - Lit le **refresh token** depuis **`expo-secure-store`** (stockage chiffré natif ;
     AsyncStorage seulement en fallback web) et le contexte utilisateur en cache
     (AsyncStorage `tarhib_auth_context`).
   - S'il y a un token → `POST /auth/refresh` pour obtenir un access token frais
     (l'access token n'est **jamais persisté**, il ne vit qu'en mémoire).
   - Puis recharge le profil complet : `GET /mobile/me` (Employee) ou `GET /operations/me`
     (Operations).
   - Si le refresh échoue → purge locale et retour à l'état déconnecté.
2. **Pas de session** → écran **Onboarding** : logo, slogan, carte indiquant l'app
   (الموظف / العمليات), choix de langue (English / Arabic RTL), bouton « ابدأ / Start ».
3. Puis écran **Login**.

### I.2 Connexion (écran partagé, 2 modes)

UI : logo carré coloré, « مرحباً بك في ترحيب 👋 », deux onglets segmentés **Email** /
**رقم الجوال** (ordre inversé en RTL).

| Action utilisateur             | Endpoint                   | Détail                                                                                                                |
| ------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Connexion email + mot de passe | `POST /auth/login`         | Œil afficher/masquer ; « mot de passe oublié » → message « contactez l'admin de votre société » (pas de self-service) |
| Envoi de code SMS              | `POST /auth/otp/request`   | Format E.164 exigé (ex. `+218912345678`), erreur 400 explicitée AR/EN                                                 |
| Vérification du code           | `POST /auth/otp/verify`    | 6 cases OTP, compte à rebours de renvoi 60 s, « إعادة إرسال الرمز », « changer le numéro »                            |
| Rafraîchissement silencieux    | `POST /auth/refresh`       | Automatique — voir I.3                                                                                                |
| Déconnexion                    | `POST /auth/logout`        | Révoque le refresh token, purge SecureStore + contexte                                                                |
| Enregistrement push            | `PATCH /auth/device-token` | Token FCM natif après chaque connexion (best-effort, no-op web/Expo Go)                                               |

Erreurs traduites : 401 → « بيانات الدخول غير صحيحة », 429 → « محاولات كثيرة »,
réseau → « تعذر الوصول إلى الخادم ».

### I.3 Cycle de vie du token (invisible pour l'utilisateur)

Chaque requête part avec `Authorization: Bearer <accessToken>`. Sur **401** (hors endpoints
d'auth), l'intercepteur axios déclenche **un seul** `POST /auth/refresh` (401 concurrents
dédupliqués), rejoue la requête d'origine, et si le refresh échoue → **déconnexion forcée**.

### I.4 Contexte d'accès — la clé du « qui voit quoi »

Après login, `GET /mobile/me` ou `GET /operations/me` renvoie le **profil d'accès complet**,
configuré depuis le web admin :

- `employee` : identité bilingue (prénom/nom AR et EN), email, téléphone, `companyId`,
  `branchId`, `departmentId`
- `scope` : **`CLIENT`** (employé d'une société cliente) ou **`TARHIB`** (personnel interne)
- `roles[]` + `primaryRoleId` : rôles dynamiques créés dans le web admin
- `permissions[]` : clés fines (`order.create`, `meeting.book`, `stock.manage`…) —
  **ce tableau pilote l'affichage/masquage dans l'app**
- `dataScope` : `GLOBAL` / `COMPANY` / `BRANCH` / `OWN` — périmètre appliqué par le serveur
- `modules[]` : modules mobiles activés avec libellés AR/EN

### I.5 Temps réel et préférences

- **Socket.io namespace `/sla`** : `order:new`, `order:status` (invalident les caches React
  Query → l'UI se met à jour seule) et `sla:tick` (compte à rebours SLA). Le polling des
  requêtes (20–30 s) sert de filet de sécurité si la socket tombe.
- **Préférences** (langue + thème clair/sombre) persistées en AsyncStorage par app
  (`tarhib_employee_preferences` / `tarhib_operations_preferences`) ; l'arabe applique la
  direction **RTL** à tout le layout.
- Police **Thmanyah** chargée au démarrage.

---

## Partie II — Tarhib Employee (vert) : employés des sociétés clientes

**Utilisateur type** : employé au scope `CLIENT`, rattaché à une société + branche. Il n'a
**jamais** accès aux données d'autres employés, ne voit **jamais de prix** (service interne,
pas d'e-commerce), et ne voit **jamais** les produits VIP libre-service (filtrés côté
serveur, règle §2 du CLAUDE.md).

**Navigation** : 5 onglets — **الرئيسية** (Accueil), **المفضلة** (Favoris), **الطلبات**
(Commandes), **السلة** (Panier), **المزيد** (Profil). Le **catalogue complet** n'est pas un
onglet : il s'ouvre **par-dessus** en plein écran.

### II.1 Onglet Accueil (الرئيسية)

**UI** : header avec cloche + pastille avatar à gauche, « أهلا {prénom} 👋 » + email alignés
à droite (RTL) ; **carte héro verte** (cercles décoratifs translucides, icône café,
« صباحك أسهل », bouton blanc « اطلب الآن ») ; rail horizontal de **cercles de catégories**
(max 6, icône déduite du nom) ; ligne « قاعات الاجتماعات » (**visible uniquement si
permission `meeting.book`**) ; section « اختيارك المفضل » avec 4 cartes produit (favoris,
sinon les 4 premiers du catalogue).

**Chargement du catalogue** — `fetchEmployeeCatalog()` fait 4 requêtes en parallèle :

| Endpoint                      | Rôle                                                                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /products`               | Produits **déjà filtrés par le serveur** selon le rôle : uniquement les `COMMANDABLE` autorisés (jamais de VIP — règle §4 : sécurité backend, pas UI) |
| `GET /products/availability`  | Stock branche → statut : **متاح** (vert), **محدود** (orange, ≤ 10), **غير متاح** (rouge)                                                              |
| `GET /products/favorites/ids` | IDs favoris (échec silencieux toléré)                                                                                                                 |
| `GET /mobile/quotas`          | Quota restant par produit (best-effort : un échec n'empêche pas le catalogue)                                                                         |

**Actions** : carte héro / « عرض الكل » / catégorie → catalogue plein écran ; cœur → favori ;
`+` → panier ; taper la carte → fiche produit.

### II.2 Catalogue plein écran (التصنيف)

**UI** : bouton retour (flèche inversée en RTL), barre de recherche avec bouton filtre vert
et croix d'effacement, puces catégories, **grille 2 colonnes**. Chaque carte : visuel
(`imageUrl` ou icône déduite), cœur en surimpression, badge stock coloré, nom (AR ou EN),
ligne quota « الحصة المتبقية 3 من 5 » (ou « الحصة غير محددة »), bouton `+` qui devient un
**stepper − / quantité / +** dès le premier ajout.

- **Recherche** : filtrage **local** (nom AR, nom EN, catégorie), aucun appel réseau.
- **Favori** : `POST /products/{id}/favorite` / `DELETE /products/{id}/favorite` —
  **mise à jour optimiste** (bascule immédiate, rollback si l'API échoue).

### II.3 Fiche produit (modale plein écran)

Grand visuel sur fond vert pâle (300 px), boutons retour + cœur flottants, **nom arabe en
grand puis nom anglais**, catégorie, quota + badge stock, **barre de progression du quota**,
stepper (min 1), bouton « إضافة إلى السلة » — **désactivé et libellé « غير متاح حالياً » si
rupture**. Aucun prix.

### II.4 Onglet Panier (السلة)

**UI** : corbeille rouge (vide tout), lignes produit (vignette, nom, quota, stepper), champ
**note libre** (500 car. max), carte résumé (« عدد الأصناف », « عدد المنتجات »), bouton
« تأكيد الطلب ». Panier vide → état vide illustré + CTA catalogue.

**Confirmation** → `POST /orders` `{ lines: [{productId, quantity}], note? }`. **Le serveur**
déroule le moteur de validation (§3 CLAUDE.md) dans l'ordre : produit commandable + rôle
autorisé → stock branche re-vérifié → quota restant. Trois issues :

- **Succès** : panier vidé, insertion optimiste dans « mes commandes », **bascule automatique
  sur l'onglet Commandes + ouverture du suivi**, invalidation des caches catalogue/quotas.
- **422** : message listant **chaque ligne rejetée avec sa raison traduite** —
  « المنتج غير قابل للطلب » (`PRODUCT_NOT_COMMANDABLE`), « غير متاح لدورك »
  (`ROLE_NOT_ALLOWED`), « المخزون غير كافٍ » (`INSUFFICIENT_STOCK`),
  « تم تجاوز الحصة » (`QUOTA_EXCEEDED`).
- **Réseau** : « تعذر الوصول إلى الخادم ».

### II.5 Onglet Commandes (الطلبات) + suivi

**Liste** : `GET /orders/me` (**filtre "mes commandes" imposé par le serveur** ; polling 20 s

- invalidation socket). Filtres locaux : الكل / قيد التنفيذ / مكتمل / ملغي. Carte : badge
  statut coloré (orange actif, vert livré, rouge rejeté), n° court `#XXXXXXXX`, date, nombre
  d'articles.

**Suivi (modale)** — ouvert au tap ou automatiquement après commande :

- Carte n° + **« الموعد المتوقع للتسليم » = `slaDeadline`** — l'employé voit une heure
  prévue, **jamais** la priorité P1–P5 ni le terme « SLA » (conforme cahier des charges).
- **Timeline verticale** sur les **vrais horodatages backend** : استلام (`createdAt`) →
  موافقة (`approvedAt`) → تحضير (`prepStartedAt`) → جاهز (`readyAt`) → تسليم
  (`deliveredAt`). Points verts = fait, orange = en cours, gris = à venir ; commande rejetée
  = 2 étapes (reçue → annulée, rouge). Mise à jour **temps réel** via la socket.
- Carte rouge « أصناف مرفوضة » si des lignes ont été rejetées individuellement (le panier
  n'est pas bloqué en entier — règle §3), avec raison par ligne.
- « عرض تفاصيل الطلب » → dépliage des lignes + note.

### II.6 Réservation de salles (modale) — conditionnelle

**Visible uniquement si `permissions` contient `meeting.book`** (accordée par rôle client
depuis le web admin). Points d'entrée (accueil + profil) **masqués** sinon — et le serveur
re-vérifie de toute façon.

| Action                                             | Endpoint                                                       |
| -------------------------------------------------- | -------------------------------------------------------------- |
| Lister les salles (scopées branche par le serveur) | `GET /meeting-rooms`                                           |
| Réserver                                           | `POST /meeting-rooms/{roomId}/bookings` `{startTime, endTime}` |
| Mes réservations                                   | `GET /meeting-rooms/bookings/me`                               |
| Annuler                                            | `DELETE /meeting-rooms/bookings/{id}`                          |

**UI** : liste de salles (radio, nom AR/EN, capacité « 8 أشخاص ») ; sélection → carte de
réservation : puces **اليوم/غداً**, heures **09:00→16:00**, durée **30 min / 1 h / 2 h** ;
succès → bannière verte « تم تأكيد الحجز ✨ » ; **409** → « القاعة محجوزة في هذا الوقت » ;
section « حجوزاتي » avec corbeille d'annulation (badge « ملغي » si déjà annulée).

### II.7 Onglet Profil (المزيد)

Avatar initiale, nom bilingue, email ; 3 compteurs (commandes / en cours / livrées, calculés
localement) ; lignes : **langue & apparence** (modale radio العربية/English + clair/sombre),
**réservations** (si `meeting.book`), notifications, aide, à-propos (v1.0.0) ; bouton rouge
**تسجيل الخروج** → `POST /auth/logout`.

---

## Partie III — Tarhib Operations (bleu) : personnel interne Tarhib

**Utilisateur type** : scope `TARHIB` — cuisinier, livreur, responsable stock, manager de
branche. Une seule app ; le contenu utile dépend des permissions du rôle (`order.prepare`,
`order.deliver`, `stock.manage`, `operations.dashboard.view`…) ; le `dataScope`
(BRANCH/COMPANY/GLOBAL) borne les données renvoyées par le serveur.

**Navigation** : 4 onglets — **Dashboard**, **File d'attente**, **Stock**, **Profil**.
Header permanent : écusson bleu, « العمليات / Operations », nom de l'agent, cloche.

### III.1 Dashboard

**Sources** (rafraîchissement automatique) :

- `GET /orders/dashboard/stats` (30 s) → **4 cartes métriques** : طلبات اليوم, قيد الانتظار
  (orange), تم تسليمها (vert), تنبيهات المخزون (rouge, articles sous seuil)
- `GET /orders?companyId=…` (20 s) + socket `/sla`

**Carte « النشاط المباشر »** (point vert « live ») : les 3 commandes les plus urgentes — n°,
premier produit, **temps SLA restant** (« 12 دقيقة », « 5 دقيقة تأخير » si dépassé), badge
statut. Vide → « لا توجد طلبات نشطة ».

### III.2 File d'attente (الطابور)

`GET /orders` filtré **localement** sur APPROVED / IN_PROGRESS / READY, **trié par échéance
SLA croissante** (recalculé à chaque rendu, jamais figé — règle §5). Puces : الكل / مؤكد /
قيد التحضير / جاهز.

Chaque carte : n°, « 3 منتجات - SLA 24 دقيقة », badge statut, **un seul bouton d'action
contextuel** :

| État        | Bouton                  | Endpoint                                           | Qui (permission serveur)    |
| ----------- | ----------------------- | -------------------------------------------------- | --------------------------- |
| APPROVED    | **بدء التحضير** (play)  | `PATCH /kitchen/orders/{id}/start`                 | Cuisinier — `order.prepare` |
| IN_PROGRESS | **تحديد كجاهز** (check) | `PATCH /kitchen/orders/{id}/ready`                 | Cuisinier — `order.prepare` |
| READY       | **تحديد كمسلم** (vélo)  | `PATCH /orders/{id}/status` `{status:'DELIVERED'}` | Livreur — `order.deliver`   |

Chaque transition invalide commandes + stats + file cuisine, **et** notifie en temps réel
l'app Employee (la timeline de l'employé avance instantanément). Pas de photo de livraison
(choix produit). File vide → « الطابور فارغ ».

### III.3 Stock (المخزون)

3 puces de zone traduites : **المطبخ** (Cuisine) / **مستودع الفرع** (Entrepôt branche) /
**المستودع المركزي** (Central).

- `GET /inventory?companyId&branchId&zone=…` (30 s) — nécessite un contexte branche ; sinon
  « سياق الفرع غير متوفر ».
- Carte article : icône cube (**triangle rouge si sous seuil min** — `belowThreshold` ou
  `quantity ≤ minThreshold`), nom du produit (résolu via `GET /products`),
  « الحد الأدنى 10 - المطبخ », **quantité en gros chiffres** (rouge si alerte).
- **Taper un article** → panneau flottant « تعديل المخزون » : quantité pré-remplie, motif
  optionnel → `POST /inventory/{itemId}/adjust` `{type:'AJUSTEMENT', quantity, reason}`
  (AJUSTEMENT = valeur absolue ; motif par défaut audité « Mobile Operations adjustment »).
  **Toute opération est historisée côté serveur** (TARHIB-41). Permission :
  `stock.manage`/`inventory.manage`.

Ce mécanisme de seuils porte aussi le **flux VIP libre-service** : les emplacements VIP
(ex. « Frigo — Bureau CFO ») sont des articles d'inventaire avec seuils, jamais des commandes.

### III.4 Profil

Avatar initiales, nom, « ملف العمليات », badge « N صلاحية » ; lignes : **mode sombre**
(bascule), **langue** (bascule AR ⇄ EN + RTL), notifications ; **تسجيل الخروج**.

### III.5 Qui peut faire quoi — synthèse mobile

| Capacité                              | Employé CLIENT                                        | Cuisinier          | Livreur            | Resp. stock       | Manager                        |
| ------------------------------------- | ----------------------------------------------------- | ------------------ | ------------------ | ----------------- | ------------------------------ |
| Catalogue + panier + commander        | ✅ (produits filtrés par rôle)                        | —                  | —                  | —                 | —                              |
| Voir ses commandes + suivi temps réel | ✅ (les siennes uniquement)                           | —                  | —                  | —                 | —                              |
| Réserver une salle                    | ✅ **seulement si `meeting.book`** (sinon UI masquée) | —                  | —                  | —                 | —                              |
| Voir priorité/SLA                     | ❌ jamais (heure prévue seulement)                    | ✅                 | ✅                 | —                 | ✅                             |
| Démarrer préparation / marquer prêt   | —                                                     | ✅ `order.prepare` | —                  | —                 | selon rôle                     |
| Marquer livré                         | —                                                     | —                  | ✅ `order.deliver` | —                 | selon rôle                     |
| Consulter/ajuster stock 3 zones       | ❌                                                    | cuisine            | —                  | ✅ `stock.manage` | ✅                             |
| Dashboard métriques                   | ❌                                                    | —                  | —                  | —                 | ✅ `operations.dashboard.view` |

Principe constant : **l'UI masque, mais c'est le serveur qui interdit** (guards JWT +
`PermissionsGuard`, périmètre `dataScope` appliqué aux requêtes).

---

## Partie IV — Portail Web Admin (React + Ant Design)

### IV.1 Vue d'ensemble

**Utilisateurs** : exclusivement le **personnel interne Tarhib** (`scope = TARHIB`). Un
compte client qui tente de se connecter est **rejeté immédiatement** : le login vérifie le
scope renvoyé et, si ce n'est pas `TARHIB`, révoque la session à peine créée
(`POST /auth/logout`) et affiche « accès réservé au personnel interne ». Même vérification à
chaque restauration de session.

**Design** : thème **SnowUI** (tokens CSS par-dessus Ant Design), police **Thmanyah**,
**clair/sombre**, **bilingue AR/EN avec RTL complet** (segmented AR/EN dans le header ;
propriétés logiques partout, jamais `left/right`). Responsive : sidebar off-canvas
< 1200 px avec scrim, recherche et sélecteurs en popovers sur tablette.

### IV.2 Authentification et session

Contrairement au mobile, **aucun token n'est jamais stocké dans le navigateur** :

1. **Login** (`/login`) : email + mot de passe → `POST /auth/login`. Le serveur pose le
   **refresh token dans un cookie HttpOnly** (le JS ne le voit jamais ; `withCredentials:
true`). L'**access token ne vit qu'en mémoire** (header axios).
2. **Restauration au chargement** : purge des anciennes clés localStorage, puis
   `POST /auth/refresh` (cookie) → `GET /auth/me` (profil bilingue, `permissions[]`,
   `companyId`, `branchId`) ; scope ≠ `TARHIB` → déconnexion forcée.
3. **Refresh silencieux programmé** : timer 60 s avant l'expiration (min 30 s),
   single-flight.
4. **Intercepteur 401** : un refresh puis rejeu ; sinon logout complet.
5. **Logout** : `POST /auth/logout` révoque et efface le cookie.

### IV.3 La coquille (AdminLayout) — affiché/masqué

**Sidebar gauche (240 px, repliable 72 px)** : menu **groupé et filtré par permissions** —
un item sans permission **n'apparaît pas du tout** :

| Section       | Item                                                         | Visible si permission                              |
| ------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| Favoris       | Tableau de bord                                              | toujours                                           |
| Configuration | Rôles & permissions                                          | `role.manage`                                      |
|               | Sociétés                                                     | `company.manage`                                   |
|               | Branches, Départements                                       | `company.manage` ou `branch.manage`                |
|               | Employés clients, Employés internes, Inscriptions en attente | `employee.manage`                                  |
|               | Produits, Journal d'audit                                    | `company.manage`                                   |
| Opérations    | Commandes, Quotas                                            | toujours (le serveur borne les données)            |
|               | Salles de réunion, Packages de services                      | `branch.manage` ou `company.manage`                |
| Inventaire    | Stock, Transferts, Fournisseurs, Achats, VIP libre-service   | `inventory.manage` ou `company.manage`             |
| Rapports      | Rapports                                                     | `report.view`, `company.manage` ou `branch.manage` |

La **même règle protège les routes** (`<RequirePermission anyOf={…}>`) — taper l'URL ne
suffit pas ; le backend re-vérifie via ses guards.

**Header sticky en verre dépoli** (blur 12 px) : burger, **breadcrumb**, **recherche globale
⌘K** (autocomplète les pages du menu), segmented **AR/EN**, bascule **lune/soleil**,
**cloche avec badge** ouvrant le **rail droit de notifications**, avatar + menu (Profil /
Déconnexion, mention « Superadmin » si `company.manage`).

**Rail droit de notifications** : calculées à partir de vraies requêtes — commandes
`PENDING` (via `GET /reports/orders`), **stock sous seuil** (via `GET /reports/inventory`),
**inscriptions en attente** (via `GET /auth/pending-registrations`). Chaque entrée navigue
vers la page concernée.

### IV.4 Périmètre de données (ScopeContext + ScopeFilterBar)

Un contexte global mémorise la **société** (et branche) de travail. Le **superadmin** démarre
en vue globale et choisit via `ScopeFilterBar` (`GET /companies`, puis
`GET /branches?companyId=`), affichée en tête des pages concernées. Un admin de branche est
**pré-scopé** sur sa société (JWT). Le scope part en query param (`?companyId=…`) — le
serveur applique de son côté le `dataScope` du rôle.

### IV.5 Pages, action par action

#### Tableau de bord (`/`)

KPI cards (commandes du jour, en attente, livrées, conformité SLA) + alertes sous-seuil /
ruptures (`GET /reports/inventory`), conformité SLA (`GET /reports/sla`). **Graphique de
tendance** construit depuis `GET /orders` : période اليوم / أسبوع / شهر / سنة / custom
(RangePicker), agrégation auto heures/jours/mois, courbes total vs livrées. Tableau des
dernières commandes (statuts colorés) → `/orders`.

#### Rôles & permissions (`/roles`) — cœur du RBAC dynamique

Deux onglets : **rôles TARHIB** et **rôles CLIENT**. Cartes : nom bilingue, nombre de
permissions (2 tags + « +N »), nombre de quotas, dates, modifier/supprimer (Popconfirm).

- Données : `GET /roles`, `GET /permissions`, `GET /companies`, `GET /products/admin`,
  `GET /sla-levels?companyId=`.
- **Formulaire rôle CLIENT** : nom AR obligatoire / EN ; permissions de base **implicites et
  non désactivables** (`order.create`, `catalog.view`, `quota.view`, `profile.edit`) ;
  **priorité SLA obligatoire** parmi les niveaux configurés de la société (pastille couleur +
  minutes ; avertissement si aucun niveau) ; **switch “Gestion des réunions”** qui
  ajoute/retire `meeting.book` + `meeting.order_services` — **c'est ce switch qui fait
  apparaître/disparaître la réservation de salles dans l'app mobile Employee** ; **switch
  quotas** + éditeur par produit (**seuls les `COMMANDABLE` sont proposables**).
- **Formulaire rôle TARHIB** : cases à cocher par permission opérationnelle.
- **Niveaux SLA** par société (`GET/PUT /sla-levels/{companyId}`) : codes, libellés
  bilingues, minutes cibles, couleurs — la « priorité » héritée par chaque commande mobile.
- CRUD : `POST /roles`, `PATCH /roles/{id}`, `DELETE /roles/{id}`.

#### Sociétés / Branches / Départements

CRUD (table + formulaire, noms bilingues AR obligatoires) : `GET|POST|PATCH|DELETE` sur
`/companies`, `/branches` (filtrées par société), `/departments`. L'arborescence multi-tenant
que les mobiles reflètent.

#### Employés (`/employees/client`, `/employees/internal`)

Deux pages jumelles par scope. Formulaire : prénom/nom **AR obligatoires**, EN optionnels,
email, téléphone international, **mot de passe (min. 8) à la création**, société → branche →
département (cascade), **rôle filtré par le scope de la page**. Actions : `POST /employees`,
`PATCH /employees/{id}`, `PATCH /employees/{id}/deactivate`, `DELETE /employees/{id}`.
Créer un employé ici = créer le compte mobile.

#### Inscriptions en attente (`/registrations`)

`GET /auth/pending-registrations` → **Approuver** (`PATCH /auth/registrations/{id}/approve`)
ou **Rejeter** (`…/reject`). **Invitation** (`POST /auth/invite`) : type CLIENT/TARHIB,
société, rôle. Pendant admin du « contactez votre administrateur » du login mobile.

#### Produits (`/products`) — réservé `company.manage`

`GET /products/admin` (catalogue **complet**, contrairement au mobile). Colonnes : nom
bilingue, catégorie, **tag bleu `COMMANDABLE` / violet `LIBRE_SERVICE_VIP`**, actif ✓/✗,
rôles autorisés. CRUD `POST|PATCH|DELETE /products…`. La liste des rôles autorisés est ce
que le backend applique au `GET /products` mobile (règle §4). Marquer un produit
`LIBRE_SERVICE_VIP` le fait **disparaître du catalogue mobile** et entrer dans le circuit VIP.

#### Commandes (`/orders`)

- `GET /orders` (scope société + filtre statut serveur) ; filtres client : priorité (codes =
  niveaux SLA configurés), plage de dates ; compteur de filtres actifs.
- Table : `#ID`, statut (tag), **priorité en libellé SLA bilingue**, échéance SLA, date.
- Clic → **drawer** : lignes produits, société/branche/employé (les champs `approvedBy`,
  `preparedBy`… portent l'identité **Keycloak** de l'acteur, résolue en nom), **StatusStepper**
  (horodatages + acteurs), raison de rejet.
- **Transitions** (Popconfirm, `PATCH /orders/{id}/status`) :
  - `PENDING` → **Approuver** / **Rejeter** — **l'approbation manager** attendue par
    l'employé mobile : dès l'approbation, la commande entre dans la file cuisine Operations
    et la timeline de l'employé avance en temps réel ;
  - `PENDING`/`APPROVED` → **Passer en préparation** ;
  - `IN_PROGRESS` → **Marquer livrée** (rattrapage admin).

#### Quotas (`/quotas`)

`GET /quotas?companyId=` ; produit (**commandables uniquement**), cible (rôle client ou
employé), **quantité max + période** (RangePicker) → `POST|PATCH|DELETE /quotas…`. Effet
immédiat mobile : barre de quota + refus `QUOTA_EXCEEDED`. **Aucune notion monétaire**
(règle §1 : pas de budget).

#### Salles (`/meeting-rooms-admin`) et Packages (`/meeting-service-packages`)

- Salles : `GET /meeting-rooms/admin/all?companyId=`, CRUD `POST|PATCH|DELETE
/meeting-rooms…`, **réservations d'une salle** (`GET /meeting-rooms/{id}/bookings`) —
  celles créées par les employés mobiles.
- Packages (petit-déjeuner, déjeuner, custom) : CRUD `/meeting-service-packages…`.

#### Stock (`/inventory`), Transferts (`/inventory-transfers`), Fournisseurs (`/suppliers`), Achats (`/procurement`)

- **Stock** : `GET /inventory` (société/branche/zone CENTRAL–BRANCH–KITCHEN),
  `POST /inventory`, **seuils min/max** (`PATCH`), **ajustements** (`POST
/inventory/{id}/adjust`, historisés), alertes `GET /inventory/alerts/below-threshold`.
  Les seuils déclenchent les statuts متاح/محدود/غير متاح côté Employee et les alertes rouges
  côté Operations.
- **Transferts** Central → Branche → Cuisine : `POST /inventory-transfers`, **Confirmer**
  (`PATCH …/confirm`) / **Annuler** (`PATCH …/cancel`) ; acteurs Keycloak résolus.
- **Fournisseurs** : CRUD `/suppliers` + **grille de prix par produit**
  (`GET|PUT /suppliers/{id}/product-prices`) — seul endroit où l'argent existe (achats),
  jamais exposé aux employés.
- **Achats** : workflow `DRAFT → SUBMITTED → VALIDATED → SENT → PARTIALLY_RECEIVED/RECEIVED`
  (+ rejet motivé, annulation) : `POST /procurement`,
  `PATCH /procurement/{id}/submit|validate|reject|send|cancel|receive`. La réception
  alimente le stock central.

#### VIP libre-service (`/vip-tasks`)

Conforme règle §2 (jamais de commandes pour le VIP) :

- **Emplacements** (`GET /vip-self-service/locations`) : ex. « Frigo — Bureau CFO »,
  multi-produits ; création (`POST …/locations`), **ajout/retrait de produits** avec seuils
  propres (`POST …/locations/{id}/products`, `DELETE …/location-products/{id}`),
  **ajustements** (`PATCH …/location-products/{id}`), **réapprovisionner**
  (`PATCH …/replenish`). Compteur d'emplacements sous seuil.
- **Tâches de réapprovisionnement** (`GET /vip-self-service/tasks`) : générées
  automatiquement sous seuil, assignées à l'agent d'hospitalité, clôturables
  (`PATCH …/tasks/{id}/complete`). Compteur de tâches `OPEN`.

#### Rapports (`/reports`)

Barre de scope + périodes, **6 onglets** : **Commandes** (`GET /reports/orders`),
**Inventaire** (`GET /reports/inventory` + `/reports/inventory-detail`, filtres zone/produit),
**Activité utilisateurs** (`GET /reports/user-activity`), **Salles**
(`GET /reports/meeting-rooms`), **Achats** (`GET /reports/purchasing`, filtres
fournisseur/produit) ; vues SLA (`GET /reports/sla`) et exécutive (`GET /reports/executive`)
consommées par le dashboard.

#### Journal d'audit (`/audit`) — réservé `company.manage`

`GET /audit` paginé, filtres entité / utilisateur / dates : trace de toutes les opérations
sensibles (dont les ajustements de stock mobiles).

#### Profil (`/profile`) et divers

Carte avatar + nom bilingue, Descriptions (email, rôle, société, branche, département).
**404 dédiée** dans le shell. Erreurs API traduites (`getErrorMessage`).

---

## Partie V — Boucle complète Web Admin ⇄ Mobiles

1. L'admin **crée société → branche → rôles (SLA, quotas, `meeting.book`) → employés** →
   l'employé se connecte sur mobile ; son `GET /mobile/me` reflète exactement cette
   configuration.
2. L'admin **configure catalogue + stock + seuils** → détermine ce que l'employé voit et
   peut commander.
3. L'employé mobile **commande** → si `PENDING`, elle apparaît dans **/orders** et dans le
   **rail de notifications** ; l'admin approuve → file cuisine Operations → préparation →
   livraison → visible dans le StatusStepper avec les acteurs, agrégé dans **/reports**.
4. Les ajustements de stock mobiles remontent dans **/inventory** et **/audit** ; les
   passages sous seuil génèrent les notifications admin et les **tâches VIP**.

---

## Annexe — Récapitulatif des endpoints par client

**Communs mobiles** : `POST /auth/login`, `/auth/otp/request`, `/auth/otp/verify`,
`/auth/refresh`, `/auth/logout`, `PATCH /auth/device-token`, socket `/sla`.

**Employee** : `GET /mobile/me`, `GET /products`, `GET /products/availability`,
`GET /products/favorites/ids`, `POST|DELETE /products/{id}/favorite`, `GET /mobile/quotas`,
`POST /orders`, `GET /orders/me`, `GET /meeting-rooms`,
`POST /meeting-rooms/{id}/bookings`, `GET /meeting-rooms/bookings/me`,
`DELETE /meeting-rooms/bookings/{id}`.

**Operations** : `GET /operations/me`, `GET /orders/dashboard/stats`, `GET /orders`,
`PATCH /kitchen/orders/{id}/start`, `PATCH /kitchen/orders/{id}/ready`,
`PATCH /orders/{id}/status`, `GET /inventory`, `POST /inventory/{id}/adjust`,
`GET /products` (résolution des noms).

**Web Admin** : `POST /auth/login|refresh|logout` (cookie HttpOnly), `GET /auth/me`,
`GET /auth/pending-registrations`, `PATCH /auth/registrations/{id}/approve|reject`,
`POST /auth/invite` ; CRUD `/companies`, `/branches`, `/departments`, `/employees`
(+ `/deactivate`), `/products` (+ `GET /products/admin`), `/roles`, `GET /permissions`,
`GET|PUT /sla-levels/{companyId}` ; `GET /orders`, `PATCH /orders/{id}/status` ;
CRUD `/quotas` ; `/meeting-rooms` (+ `admin/all`, `{id}/bookings`),
`/meeting-service-packages` ; `/inventory` (+ `adjust`, `alerts/below-threshold`),
`/inventory-transfers` (+ `confirm`, `cancel`), `/suppliers` (+ `product-prices`),
`/procurement` (+ `submit|validate|reject|send|cancel|receive`), `/vip-self-service/*` ;
`GET /reports/orders|inventory|inventory-detail|sla|user-activity|meeting-rooms|purchasing|executive` ;
`GET /audit`.
