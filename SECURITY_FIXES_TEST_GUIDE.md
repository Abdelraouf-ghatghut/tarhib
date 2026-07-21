# Guide de test — Corrections sécurité / API design / best practices

Couvre toutes les corrections de la session (IDOR multi-tenant, transactions,
rate limiting, helmet, pagination, N+1, validation, CSP web-admin).

---

## 0. Prérequis — à exécuter avant tout test

```bash
# 1. Services (Postgres, Redis, Keycloak)
docker compose up -d

# 2. Dépendances
cd apps/backend && npm install
cd ../web-admin && npm install

# 3. Migrations
cd ../backend
npm run migration:run

# 4. Données de test (--reset repart de zéro : société "Al Waha Bank",
#    utilisateurs seedés, mot de passe commun Tarhib@2026!)
npm run seed:reset

# 5. Backend (terminal 1)
npm run start:dev
# → http://localhost:3000, Swagger sur http://localhost:3000/api-docs

# 6. Web Admin (terminal 2)
cd ../web-admin
npm run dev
# → http://localhost:5173
```

Comptes seedés utiles (mot de passe : `Tarhib@2026!`) :

| Email                   | Rôle           | Portée                   |
| ----------------------- | -------------- | ------------------------ |
| `superadmin@tarhib.app` | Super Admin    | GLOBAL (toutes sociétés) |
| `admin@tarhib.app`      | Branch Manager | Al Waha Bank             |
| `manager@tarhib.app`    | —              | Al Waha Bank             |

Une seule société ("Al Waha Bank") est seedée. Pour les tests d'IDOR
**cross-tenant**, créez une 2ᵉ société avec le compte `superadmin@tarhib.app`
(étape 1.2 ci-dessous).

---

## 1. Tests automatisés (à lancer avant les tests manuels)

```bash
cd apps/backend

# Suite complète
npx tsc --noEmit         # attendu : 1 seule erreur pré-existante hors-scope
                          # (access-policy.service.spec.ts) — tout le reste doit être vert
npx eslint src --quiet   # attendu : 0 erreur
npx jest --silent        # attendu : 38 suites / 272 tests verts

# npm audit — vérifie l'état des dépendances
npm audit
# attendu : 8 vulnérabilités modérées restantes, toutes via
# firebase-admin→google-gax→uuid (risque accepté, forcer casserait FCM)

cd ../web-admin
npx tsc --noEmit          # attendu : aucune erreur
npx eslint src --quiet    # attendu : aucune erreur
npx vite build             # attendu : build OK, dist/index.html contient la CSP
```

Si un test échoue ici, ne pas continuer les tests manuels avant d'avoir
identifié pourquoi — sinon vous testerez du code non conforme à l'état validé.

---

## 2. Obtenir des tokens de test

```bash
# Token Al Waha Bank (admin)
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tarhib.app","password":"Tarhib@2026!"}' \
  | tee /tmp/admin_alwaha.json
export TOKEN_ALWAHA=$(cat /tmp/admin_alwaha.json | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken')

# Token superadmin (GLOBAL)
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@tarhib.app","password":"Tarhib@2026!"}' \
  | tee /tmp/superadmin.json
export TOKEN_SUPERADMIN=$(cat /tmp/superadmin.json | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken')
```

### 1.2 Créer une 2ᵉ société (pour les tests cross-tenant)

```bash
curl -s -X POST http://localhost:3000/companies \
  -H "Authorization: Bearer $TOKEN_SUPERADMIN" \
  -H "Content-Type: application/json" \
  -d '{"nameAr":"شركة اختبار","nameEn":"Test Co B"}' \
  | tee /tmp/company_b.json
export COMPANY_B=$(cat /tmp/company_b.json | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')

# Créer une branche + un employé admin dans cette 2e société pour obtenir
# un token "étranger" (répéter via /branches puis /employees + /auth/register
# ou directement en base — le plus simple : utiliser Swagger UI pour ces
# étapes ponctuelles d'admin).
```

> Le plus rapide en pratique : ouvrir Swagger (`/api-docs`), s'authentifier
> avec `TOKEN_SUPERADMIN`, et créer branche + employé de la société B à la
> main (2-3 appels). Notez l'`id` d'un employé/commande/quota de la société A
> (Al Waha Bank) pour les tester avec le token de la société B, et vice-versa.

---

## 3. Tests manuels par fonctionnalité

### 3.1 IDOR multi-tenant (employees, orders, branches, departments, companies, quotas)

Principe commun : lire une ressource de la société A avec un token de la
société B → doit renvoyer **403 Forbidden**, jamais 200.

```bash
# Exemple avec un employé de Al Waha Bank (ID à récupérer via GET /employees)
export EMP_ID_ALWAHA=<uuid>

curl -s -o /dev/null -w "%{http_code}\n" \
  http://localhost:3000/employees/$EMP_ID_ALWAHA \
  -H "Authorization: Bearer $TOKEN_COMPANY_B"
# attendu : 403

curl -s -o /dev/null -w "%{http_code}\n" \
  http://localhost:3000/employees/$EMP_ID_ALWAHA \
  -H "Authorization: Bearer $TOKEN_ALWAHA"
# attendu : 200 (même société)
```

Répéter le même schéma pour :

- `GET /orders/:id`
- `GET /branches/:id`
- `GET /departments/:id`
- `GET /companies/:id`
- `GET /quotas/:id`

Avec `TOKEN_SUPERADMIN` (dataScope GLOBAL), **tous** doivent renvoyer 200 quelle
que soit la société — vérifie que le bypass admin fonctionne toujours.

### 3.2 Escalade de privilèges sur `/employees`

```bash
# Un employé standard tente de se transformer en admin via son propre PATCH
export SELF_TOKEN=<token d'un compte EMPLOYEE standard>
export SELF_ID=<son propre id>
export ADMIN_ROLE_ID=<uuid d'un rôle admin>

curl -s -o /dev/null -w "%{http_code}\n" -X PATCH \
  http://localhost:3000/employees/$SELF_ID \
  -H "Authorization: Bearer $SELF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"roleId\":\"$ADMIN_ROLE_ID\"}"
# attendu : 403 (permission employee.manage/company.manage requise)
```

### 3.3 Transactions `orders.service.ts`

Pas testable facilement en boîte noire (il faut provoquer un échec au milieu
d'une transaction). Deux options :

1. **Test unitaire déjà écrit** — relire `orders.service.spec.ts`, section
   "nomenclature (recette) au passage IN_PROGRESS", qui vérifie qu'un échec
   de décrémentation bloque la transition ET que `orderRepo.save` n'est pas
   appelé.
2. **Vérification manuelle en DB** : passer une commande à `IN_PROGRESS` sur
   un produit dont un seul ingrédient (sur plusieurs) a un stock insuffisant
   → la commande entière doit rester au statut précédent et **aucun** des
   stocks (même ceux qui avaient assez de stock) ne doit avoir bougé.
   ```sql
   -- avant/après l'appel PATCH /orders/:id/status {"status":"IN_PROGRESS"}
   SELECT product_id, quantity FROM inventory_items WHERE branch_id = '<br>';
   ```

### 3.4 Rate limiting

```bash
# Login : limite 20/min par IP (route publique). Un email DIFFÉRENT à chaque
# essai — sinon c'est le verrou par compte (5 échecs, voir auth.service.ts)
# qui répond 429 dès la 5e tentative, ce qui fausserait le test du throttle IP.
for i in $(seq 1 22); do
  curl -s -o /dev/null -w "%{http_code} " -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"nobody$i@nowhere.com\",\"password\":\"wrong\"}"
done
echo
# attendu : les ~20 premiers 401 (mauvais identifiants), puis 429 à partir
# du 21e (throttle IP, pas verrou de compte)
```

```bash
# Quota global par utilisateur authentifié : 600/min — répéter un GET léger
for i in $(seq 1 610); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/employees \
    -H "Authorization: Bearer $TOKEN_ALWAHA"
done | sort | uniq -c
# attendu : ~600 x 200, puis des 429 au-delà — et un 2e utilisateur
# (TOKEN_COMPANY_B) lancé en parallèle ne doit PAS être affecté (bucket
# séparé par sub JWT, pas par IP)
```

### 3.5 Helmet (en-têtes HTTP)

```bash
curl -sI http://localhost:3000/employees -H "Authorization: Bearer $TOKEN_ALWAHA"
# attendu : présence de X-Content-Type-Options: nosniff,
# X-DNS-Prefetch-Control, Strict-Transport-Security (si HTTPS), etc.
# PAS de Content-Security-Policy ici (désactivée volontairement côté API,
# CSP gérée côté web-admin — voir 3.13)
```

### 3.6 `forbidNonWhitelisted`

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/departments \
  -H "Authorization: Bearer $TOKEN_ALWAHA" \
  -H "Content-Type: application/json" \
  -d '{"nameAr":"test","nameEn":"test","branchId":"<uuid>","champInconnu":"boom"}'
# attendu : 400 (property champInconnu should not exist)
```

### 3.7 Gardes sur `/products/:id/recipe` et `/permissions`

```bash
# Avec un token EMPLOYEE standard (sans company.manage/branch.manage)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/permissions \
  -H "Authorization: Bearer $SELF_TOKEN"
# attendu : 403

curl -s -o /dev/null -w "%{http_code}\n" \
  http://localhost:3000/products/<uuid-produit-composé>/recipe \
  -H "Authorization: Bearer $SELF_TOKEN"
# attendu : 403

# Avec TOKEN_ALWAHA (a company.manage ou branch.manage) → 200
```

### 3.8 `@HttpCode(204)` sur les DELETE

```bash
for path in "quotas/<id>" "suppliers/<id>" "roles/<id>" "products/<id>" \
            "meeting-rooms/<id>" "meeting-service-packages/<id>" \
            "vip-self-service/location-products/<id>"; do
  echo -n "$path -> "
  curl -s -o /dev/null -w "%{http_code}\n" \
    "http://localhost:3000/$path" \
    -X DELETE -H "Authorization: Bearer $TOKEN_ALWAHA"
done
# attendu : 204 partout (pas 200)
```

### 3.9 Pagination

```bash
# Sans page/limit : comportement inchangé (jusqu'à 200 résultats)
curl -s http://localhost:3000/employees -H "Authorization: Bearer $TOKEN_ALWAHA" \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).length'

# Avec limit=2 : doit renvoyer exactement 2 éléments (si ≥2 en base)
curl -s "http://localhost:3000/employees?limit=2" \
  -H "Authorization: Bearer $TOKEN_ALWAHA" \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).length'
# attendu : 2

# page=2&limit=2 doit renvoyer des éléments DIFFÉRENTS de page=1
curl -s "http://localhost:3000/employees?page=1&limit=2" -H "Authorization: Bearer $TOKEN_ALWAHA" > /tmp/p1.json
curl -s "http://localhost:3000/employees?page=2&limit=2" -H "Authorization: Bearer $TOKEN_ALWAHA" > /tmp/p2.json
diff /tmp/p1.json /tmp/p2.json && echo "FAIL: pages identiques" || echo "OK: pages différentes"
```

Répéter sur `/orders`, `/inventory`, `/procurement`, `/inventory-transfers`,
`/quotas`.

### 3.10 N+1 `delivery.service.ts`

Pas observable via curl seul. Deux façons de vérifier :

1. **Logs SQL temporaires** — dans `apps/backend/src/app.module.ts`, passer
   `logging: true` dans la config TypeORM, relancer `npm run start:dev`,
   puis appeler `GET /delivery/queue` avec plusieurs commandes READY en
   base. Compter les requêtes `SELECT ... FROM delivery_tasks WHERE order_id
IN (...)` (une seule, batchée) au lieu d'une requête par commande.
2. **Test unitaire** — `delivery.service.spec.ts` couvre déjà le
   comportement de création batchée (`repo.save` appelé une fois avec un
   tableau).

### 3.11 Validation `CreateRoleQuotaDto`

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  http://localhost:3000/roles/<roleId>/quotas \
  -H "Authorization: Bearer $TOKEN_ALWAHA" \
  -H "Content-Type: application/json" \
  -d '{"productId":"<uuid>","periodType":"NOT_A_PERIOD","maxQuantity":-5}'
# attendu : 400 (periodType hors enum ET maxQuantity < 1)
```

### 3.12 `inventory-transfers` (couverture de test)

```bash
cd apps/backend
npx jest src/inventory-transfers --verbose
# attendu : 11 tests verts (create, confirmAtomic, cancel)
```

### 3.13 CSP web-admin

```bash
cd apps/web-admin
npx vite build
npx vite preview --port 4174 &
curl -s http://localhost:4174/ | grep -A1 "Content-Security-Policy"
# attendu : présence de la balise meta CSP avec script-src 'self' (pas de
# 'unsafe-inline' sur script-src)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4174/theme-init.js
# attendu : 200 (script anti-FOUC externalisé, chargé sans violer la CSP)
kill %1
```

**Test navigateur (obligatoire, pas seulement curl)** :

1. Ouvrir `http://localhost:4174` dans Chrome/Firefox
2. Ouvrir la console développeur → onglet Console
3. Vérifier qu'il n'y a **aucune erreur CSP** (`Refused to execute inline
script...`)
4. Vérifier que le thème clair/sombre s'applique correctement dès le premier
   rendu (pas de flash blanc→sombre) — confirme que `theme-init.js` s'exécute
   bien malgré la CSP stricte

---

## 4. Checklist finale

- [ ] `npx tsc --noEmit` backend + web-admin : clean
- [ ] `npx eslint src --quiet` backend + web-admin : 0 erreur
- [ ] `npx jest --silent` backend : 272/272 verts
- [ ] IDOR : 403 cross-tenant sur employees/orders/branches/departments/companies/quotas, 200 same-tenant et GLOBAL
- [ ] PATCH `/employees/:id` avec `roleId` par un non-admin → 403
- [ ] Rate limit login → 429 après ~20 tentatives/min
- [ ] Rate limit global : 2 utilisateurs différents ne se bloquent pas mutuellement
- [ ] Headers helmet présents sur les réponses API
- [ ] Body avec champ inconnu → 400
- [ ] `/permissions` et `/products/:id/recipe` → 403 sans permission
- [ ] DELETE → 204 (pas 200) sur tous les endpoints listés
- [ ] Pagination : `limit` respecté, `page=2` ≠ `page=1`
- [ ] `POST /roles/:id/quotas` avec `periodType` invalide → 400
- [ ] CSP visible dans `dist/index.html`, aucune erreur console navigateur
- [ ] `npm audit` : 8 vulnérabilités restantes, toutes documentées comme risque accepté
