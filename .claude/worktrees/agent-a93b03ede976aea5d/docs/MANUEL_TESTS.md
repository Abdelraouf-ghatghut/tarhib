# Guide de tests manuels — Tarhib Backend

> **Périmètre :** modules mergés sur `main` au 27 juin 2026.
> Auth · Companies · Branches · Departments · Employees · Products · Inventory · Orders · Quotas
>
> Outil recommandé : **Bruno** (open-source, similaire à Postman) ou `curl`.
> La Swagger UI est disponible à `http://localhost:3000/api` quand le backend tourne.

---

## 1. Prérequis — démarrer l'infrastructure

### 1.1 Démarrer Postgres + Redis

```bash
# Depuis la racine du repo
docker-compose up -d
```

Vérifie que les deux containers sont `Up` :

```bash
docker ps
# tarhib-postgres   Up   0.0.0.0:5432->5432/tcp
# tarhib-redis      Up   0.0.0.0:6379->6379/tcp
```

### 1.2 Lancer les migrations TypeORM

```bash
cd apps/backend
npm run typeorm:migration:run
# OU selon la config du projet :
npx typeorm migration:run -d src/data-source.ts
```

> Après les migrations, les tables suivantes doivent exister en base :
> `companies`, `branches`, `departments`, `employees`,
> `products`, `inventory_items`, `orders`, `order_lines`, `quotas`

Vérifie avec `psql` :

```bash
psql postgresql://tarhib:tarhib_dev@localhost:5432/tarhib_dev -c "\dt"
```

### 1.3 Démarrer le backend

```bash
cd apps/backend
npm run start:dev
# Le serveur écoute sur http://localhost:3000
# Swagger : http://localhost:3000/api
```

---

## 2. Obtenir un token JWT de test

> Keycloak n'est pas encore configuré (realm `tarhib` à créer). Pour les tests
> manuels, générer un token signé directement avec `JWT_SECRET`.

### Méthode rapide — script Node.js inline

```bash
node -e "
const jwt = require('jsonwebtoken');
const secret = 't0kwTKT+ffAtAaE9JR5hOUuMFUon7uYXPXAIvM3qj8EgNGrd2GBmkaSPWNJxypdYb3J9zq9pcfwON8Leth9/eg==';

// Token ADMIN
const admin = jwt.sign(
  { sub: '00000000-0000-0000-0000-000000000001', email: 'admin@tarhib.dev',
    role: 'ADMIN', companyId: '<COMPANY_UUID>', branchId: '<BRANCH_UUID>' },
  secret, { expiresIn: '8h' }
);
console.log('ADMIN:', admin);

// Token EMPLOYEE
const emp = jwt.sign(
  { sub: '00000000-0000-0000-0000-000000000002', email: 'emp@tarhib.dev',
    role: 'EMPLOYEE', companyId: '<COMPANY_UUID>', branchId: '<BRANCH_UUID>' },
  secret, { expiresIn: '8h' }
);
console.log('EMPLOYEE:', emp);
"
```

> Remplace `<COMPANY_UUID>` et `<BRANCH_UUID>` par les UUIDs réels après avoir
> créé une company et une branch (section 4).
> Pour les premiers tests (Companies), n'importe quel UUID v4 convient.

Stocke les tokens dans des variables shell :

```bash
ADMIN_TOKEN="<token_admin_ci-dessus>"
EMP_TOKEN="<token_employee_ci-dessus>"
```

---

## 3. Auth — `GET /auth/me`

Valide que le guard JWT fonctionne et que le payload est correctement injecté.

```bash
# Doit retourner le payload du token
curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Résultat attendu :
# {
#   "sub": "00000000-0000-0000-0000-000000000001",
#   "email": "admin@tarhib.dev",
#   "role": "ADMIN",
#   "companyId": "...",
#   "branchId": "..."
# }
```

```bash
# Sans token → 401
curl -s http://localhost:3000/auth/me | jq .
# {"statusCode":401,"message":"Unauthorized"}
```

```bash
# Token invalide → 401
curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer faux.token.ici" | jq .
```

---

## 4. Companies — `POST /companies`, `GET /companies`, `GET /companies/:id`, `DELETE /companies/:id`

### 4.1 Créer une company

```bash
curl -s -X POST http://localhost:3000/companies \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Société Test","slug":"societe-test"}' | jq .

# Copie l'UUID retourné
COMPANY_ID="<uuid_retourné>"
```

**Résultat attendu :** `201` avec `id`, `name`, `slug`, `active: true`.

### 4.2 Slug en doublon → conflit

```bash
curl -s -X POST http://localhost:3000/companies \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Autre","slug":"societe-test"}' | jq .

# Attendu : 409 Conflict
```

### 4.3 Lister

```bash
curl -s http://localhost:3000/companies \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 4.4 Soft-delete

```bash
curl -s -X DELETE http://localhost:3000/companies/$COMPANY_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Vérifier que la company n'apparaît plus dans GET /companies
curl -s http://localhost:3000/companies \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

---

## 5. Branches

```bash
# Recréer la company si nécessaire, puis :
curl -s -X POST http://localhost:3000/branches \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"companyId\":\"$COMPANY_ID\",\"nameAr\":\"الفرع الرئيسي\",\"nameEn\":\"Main Branch\"}" | jq .

BRANCH_ID="<uuid_retourné>"
```

```bash
# Filtrage par company
curl -s "http://localhost:3000/branches?companyId=$COMPANY_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

---

## 6. Departments

```bash
curl -s -X POST http://localhost:3000/departments \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"companyId\":\"$COMPANY_ID\",\"branchId\":\"$BRANCH_ID\",\"nameAr\":\"الموارد البشرية\",\"nameEn\":\"Human Resources\"}" | jq .

DEPT_ID="<uuid_retourné>"
```

```bash
# Filtrage combiné
curl -s "http://localhost:3000/departments?companyId=$COMPANY_ID&branchId=$BRANCH_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

---

## 7. Employees

### 7.1 Créer un employé

```bash
curl -s -X POST http://localhost:3000/employees \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"companyId\":\"$COMPANY_ID\",
    \"branchId\":\"$BRANCH_ID\",
    \"departmentId\":\"$DEPT_ID\",
    \"firstNameAr\":\"محمد\",
    \"firstNameEn\":\"Mohamed\",
    \"lastNameAr\":\"علي\",
    \"lastNameEn\":\"Ali\",
    \"email\":\"m.ali@test.com\",
    \"phoneNumber\":\"+213555000001\",
    \"role\":\"EMPLOYEE\"
  }" | jq .

EMP_ID="<uuid_retourné>"
```

### 7.2 Format téléphone invalide → 400

```bash
curl -s -X POST http://localhost:3000/employees \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"companyId\":\"$COMPANY_ID\",\"branchId\":\"$BRANCH_ID\",\"departmentId\":\"$DEPT_ID\",
       \"firstNameAr\":\"ت\",\"firstNameEn\":\"T\",\"lastNameAr\":\"س\",\"lastNameEn\":\"S\",
       \"email\":\"t@s.com\",\"phoneNumber\":\"0555000001\",\"role\":\"EMPLOYEE\"}" | jq .

# Attendu : 400, message contenant "E.164"
```

---

## 8. Products

> Règle critique §3.2 CLAUDE.md : les produits `LIBRE_SERVICE_VIP` ne doivent
> **jamais** apparaître dans le catalogue d'un non-ADMIN.

### 8.1 Créer un produit COMMANDABLE

```bash
curl -s -X POST http://localhost:3000/products \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nameAr":"قهوة","nameEn":"Coffee","category":"beverages",
       "type":"COMMANDABLE","allowedRoles":["EMPLOYEE","DEPARTMENT_MANAGER"]}' | jq .

PROD_COFFEE_ID="<uuid_retourné>"
```

### 8.2 Créer un produit VIP libre-service

```bash
curl -s -X POST http://localhost:3000/products \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nameAr":"عصير طبيعي","nameEn":"Fresh Juice","category":"beverages","type":"LIBRE_SERVICE_VIP"}' | jq .

PROD_VIP_ID="<uuid_retourné>"
```

### 8.3 Catalogue ADMIN — voit tout

```bash
curl -s http://localhost:3000/products \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '[.[] | {nameEn, type}]'

# Attendu : Coffee (COMMANDABLE) + Fresh Juice (LIBRE_SERVICE_VIP) tous les deux présents
```

### 8.4 Catalogue EMPLOYEE — VIP masqué (filtrage backend §4 CLAUDE.md)

> Regénère un token EMPLOYEE avec les bons companyId/branchId si nécessaire.

```bash
curl -s http://localhost:3000/products \
  -H "Authorization: Bearer $EMP_TOKEN" | jq '[.[] | {nameEn, type}]'

# Attendu : UNIQUEMENT Coffee (COMMANDABLE)
# Fresh Juice (LIBRE_SERVICE_VIP) doit être absent — filtré côté API, pas UI
```

### 8.5 Produit avec allowedRoles restrictif

```bash
# Créer un produit réservé aux managers
curl -s -X POST http://localhost:3000/products \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nameAr":"طبق مميز","nameEn":"Premium Dish","category":"meals",
       "type":"COMMANDABLE","allowedRoles":["DEPARTMENT_MANAGER","ADMIN"]}' | jq .

# Un token EMPLOYEE ne doit PAS voir ce produit dans son catalogue
curl -s http://localhost:3000/products \
  -H "Authorization: Bearer $EMP_TOKEN" | jq '[.[] | .nameEn]'
# Attendu : ["Coffee"]   (Premium Dish absent)
```

---

## 9. Inventory

> L'`InventoryController` est actuellement vide (routes non exposées).
> Tester directement en base SQL ou attendre l'implémentation des routes.

```sql
-- Insérer manuellement un stock pour les tests Orders (section 10)
INSERT INTO inventory_items (id, company_id, branch_id, product_id, quantity, min_threshold, max_threshold)
VALUES (gen_random_uuid(), '<COMPANY_ID>', '<BRANCH_ID>', '<PROD_COFFEE_ID>', 50, 5, 100);
```

---

## 10. Orders + Moteur de validation

> Le moteur de validation suit l'ordre **strict** §3.3 :
> rôle/type produit → stock disponible → quota restant.

### 10.1 Créer une commande valide

> En dev, le `ValidationContext` reçoit des snapshots vides → toutes les lignes
> passent en APPROVED par défaut (les repos cross-module seront câblés après
> merge des branches Products+Inventory).

```bash
curl -s -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"lines\":[{\"productId\":\"$PROD_COFFEE_ID\",\"quantity\":2}]}" | jq .

# Attendu :
# {
#   "id": "...",
#   "status": "PENDING",
#   "priority": "P5",           ← rôle EMPLOYEE = P5
#   "slaDeadline": "...",       ← maintenant + 60 min
#   "lines": [{ "productId": "...", "quantity": 2, "validationStatus": "APPROVED" }]
# }
```

### 10.2 Vérifier la priorité selon le rôle

| Rôle               | Priorité attendue | SLA     |
| ------------------ | ----------------- | ------- |
| ADMIN              | P1                | +10 min |
| DEPARTMENT_MANAGER | P2                | +20 min |
| INVENTORY_MANAGER  | P3                | +30 min |
| HOSPITALITY_AGENT  | P3                | +30 min |
| EMPLOYEE           | P5                | +60 min |

```bash
# Générer un token ADMIN avec le même companyId/branchId
ADMIN_TOKEN_2="<token_admin_avec_companyId_et_branchId_réels>"

curl -s -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $ADMIN_TOKEN_2" \
  -H "Content-Type: application/json" \
  -d "{\"lines\":[{\"productId\":\"$PROD_COFFEE_ID\",\"quantity\":1}]}" | jq '.priority'

# Attendu : "P1"
```

### 10.3 SLA dans le futur

```bash
ORDER=$(curl -s -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"lines\":[{\"productId\":\"$PROD_COFFEE_ID\",\"quantity\":1}]}")

echo $ORDER | jq '{status, priority, slaDeadline, createdAt}'
# Vérifier que slaDeadline > createdAt (+ ~60 min pour EMPLOYEE)
```

### 10.4 Lister les commandes (filtrage tenant)

```bash
curl -s "http://localhost:3000/orders?companyId=$COMPANY_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.[] | {id, status, priority}'
```

### 10.5 Récupérer une commande par ID

```bash
ORDER_ID=$(echo $ORDER | jq -r '.id')

curl -s "http://localhost:3000/orders/$ORDER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# ID inexistant → 404
curl -s "http://localhost:3000/orders/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 10.6 Corps invalide → 400

```bash
# Panier vide
curl -s -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lines":[]}' | jq .
# Attendu : 400 (ArrayMinSize failed)

# quantity = 0
curl -s -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"lines\":[{\"productId\":\"$PROD_COFFEE_ID\",\"quantity\":0}]}" | jq .
# Attendu : 400 (IsPositive failed)
```

---

## 11. Quotas

### 11.1 Créer un quota

```bash
TODAY=$(date +%Y-%m-%d)
END_MONTH=$(date -d "$(date +%Y-%m-01) +1 month -1 day" +%Y-%m-%d 2>/dev/null \
  || date -v+1m -v-1d +%Y-%m-%d)  # macOS fallback

curl -s -X POST http://localhost:3000/quotas \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"employeeId\":\"$EMP_ID\",
    \"productId\":\"$PROD_COFFEE_ID\",
    \"companyId\":\"$COMPANY_ID\",
    \"periodStart\":\"$TODAY\",
    \"periodEnd\":\"$END_MONTH\",
    \"maxQuantity\":20
  }" | jq .

QUOTA_ID="<uuid_retourné>"
# Attendu : usedQuantity = 0
```

### 11.2 Lister

```bash
curl -s "http://localhost:3000/quotas?companyId=$COMPANY_ID&employeeId=$EMP_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 11.3 Récupérer par ID

```bash
curl -s "http://localhost:3000/quotas/$QUOTA_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

### 11.4 Supprimer

```bash
curl -s -X DELETE "http://localhost:3000/quotas/$QUOTA_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Attendu : 200/204 sans body

# Vérifier suppression
curl -s "http://localhost:3000/quotas/$QUOTA_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
# Attendu : 404
```

---

## 12. Tests unitaires (non-régression)

```bash
cd apps/backend
npm test -- --verbose

# Modules couverts :
#   auth/auth.service.spec.ts          — JWT guard, RBAC guard (11 cas + 8 e2e)
#   companies/companies.service.spec.ts — CRUD, NotFoundException, soft-delete
#   employees/employees.service.spec.ts — create/findAll/findOne/remove
#   products/products.service.spec.ts  — VIP exclusion, role filtering
#   inventory/inventory.service.spec.ts — ConflictException, belowThreshold
#   orders/validation-engine/validation-engine.spec.ts  — 12 cas moteur §3.3
#   orders/orders.service.spec.ts      — priorité rôle, SLA futur, 404
#   quotas/quotas.service.spec.ts      — create, findOne, remove, findAll

npm test -- --coverage
# Objectif : >80% lignes sur src/orders/, src/quotas/, src/products/
```

---

## 13. Comportements à ne PAS observer (régressions interdites)

| Scénario                            | Comportement interdit                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| `GET /products` en tant qu'EMPLOYEE | Voir un produit `LIBRE_SERVICE_VIP`                                                 |
| `GET /products` en tant qu'EMPLOYEE | Voir un produit dont `allowedRoles` exclut EMPLOYEE                                 |
| `POST /orders`                      | Un champ `budget` ou `amount` dans la réponse                                       |
| `POST /orders`                      | Une seule ligne rejetée bloque l'ensemble du panier                                 |
| N'importe quel endpoint             | Filtrage par rôle ou type de produit côté UI seulement (doit être refusé par l'API) |

---

## 14. Limitations connues à la date du guide

| Limitation                                        | Raison                                                                        | Ticket à venir           |
| ------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------ |
| `GET/POST /inventory/*` — aucune route            | `InventoryController` vide                                                    | TARHIB-STOCK             |
| Moteur de validation reçoit des snapshots vides   | Cross-module data non câblé (Products+Inventory+Quotas sur branches séparées) | TARHIB-6 wiring          |
| Keycloak `POST /auth/login` — realm non configuré | Realm `tarhib` à créer manuellement                                           | Voir section 8 CLAUDE.md |
| `EmailService` — stub logger                      | `SENDGRID_API_KEY` non disponible                                             | TARHIB-notif             |
| `SmsService` — mode mock                          | `TWILIO_ACCOUNT_SID` en .env mais non validé en prod                          | TARHIB-notif             |

---

## 15. Checklist de validation avant merge d'une PR

- [ ] `npm test` passe sans erreur
- [ ] `npm run build` passe (TypeScript strict)
- [ ] Les endpoints touchant `orders/`, `quotas/` ou `products/` respectent l'ordre §3.3 CLAUDE.md
- [ ] Aucun produit `LIBRE_SERVICE_VIP` n'apparaît dans `GET /products` pour un non-ADMIN
- [ ] Aucune notion de `budget` (variable, DTO, commentaire) dans les fichiers modifiés
- [ ] Chaque entité bilingue a `nameAr` ET `nameEn`
- [ ] Si DTO modifié dans `products/`, `orders/` ou `quotas/` → lancer `npm run generate:mobile-api`
