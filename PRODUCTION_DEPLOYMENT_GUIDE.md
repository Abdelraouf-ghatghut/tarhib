# Guide de mise en production — Tarhib (de 0 à héro)

Web Admin + Base de données + Auth (Keycloak) + API (backend) + Applications mobiles.
**Contexte : lancement réel en Libye, ~2000 utilisateurs. Priorité : coût minimal, disponibilité correcte, service stable.**

---

## 0. Décision d'architecture (résumé — voir raisonnement complet en annexe §A)

**Formule retenue : hybride.**

- **VM** : LibyanSpider, plan **Recluse** (4 vCPU / 16 Go / 160 Go SSD), datacenter **Tripoli** — paiement en LYD, meilleure latence pour les utilisateurs libyens
- **Base de données** : **PostgreSQL managée DigitalOcean** (tier 2 Go) — sauvegardes automatiques + PITR sur la donnée la plus critique du système, un seul poste en devise étrangère (~30 $/mois)
- **Domaine** : `tarhib.ly` chez LibyanSpider (registrar officiel `.ly`)
- **Keycloak, Redis, backend, web-admin** : containers Docker sur le VM LibyanSpider
- **Coût total infra** : ~57 $/mois (~684 $/an), hors SMS OTP (variable, à chiffrer en premier — §7.6) et hors mobile (§9)

```
                         Internet
                            │
                       ┌────▼────┐
                       │  Caddy  │  reverse proxy + TLS auto (gratuit)
                       └────┬────┘
          ┌─────────────────┼─────────────────┐
          │                 │                 │
   admin.tarhib.ly    api.tarhib.ly     auth.tarhib.ly
   (web-admin,        (backend NestJS,   (Keycloak,
    fichiers           container)         container)
    statiques)              │                 │
                             └────────┬────────┘
                                      │
                          PostgreSQL managée DigitalOcean
                          (externe, 2 bases : tarhib + keycloak)
                                      │
                       Redis (container, données éphémères
                       uniquement — verrous login, sessions OTP)

   ── VM unique (LibyanSpider Recluse, Tripoli) ──
   Caddy + backend + web-admin (statique) + Keycloak + Redis
```

---

## PARTIE 1 — Comptes à créer avant de commencer

| Compte                                                  | Pourquoi                 | Coût              |
| ------------------------------------------------------- | ------------------------ | ----------------- |
| LibyanSpider                                            | VM + domaine `.ly`       | Voir §7.1         |
| DigitalOcean                                            | PostgreSQL managée       | ~30 $/mois        |
| Apple Developer Program                                 | Publication iOS          | 99 $/an           |
| Google Play Console                                     | Publication Android      | 25 $ (unique)     |
| Expo/EAS (déjà probablement fait — `eas.json` existe)   | Builds mobiles cloud     | Gratuit au départ |
| Firebase                                                | Push notifications (FCM) | Gratuit           |
| Twilio (déjà configuré en dev, vérifier le compte prod) | SMS/WhatsApp OTP         | Variable — §7.6   |

Prévoir les moyens de paiement correspondants **avant** de commencer (carte internationale pour DigitalOcean/Apple/Google, paiement local LYD pour LibyanSpider).

---

## PARTIE 2 — Base de données (DigitalOcean PostgreSQL managée)

1. Créer un compte DigitalOcean → **Databases** → **Create Database Cluster**
2. Moteur : PostgreSQL 16 (cohérent avec `postgres:16` utilisé en dev)
3. Tier : **Basic, 2 Go RAM / 1 vCPU / 25 Go stockage** (~30 $/mois)
4. Région : Europe (Frankfurt/Amsterdam — la plus proche disponible, peu importe car cette base n'est pas sur le chemin critique de latence utilisateur, seul le VM l'est)
5. Une fois créé, dans l'onglet **Users & Databases** :
   - Créer 2 bases : `tarhib` et `keycloak`
   - Noter la chaîne de connexion complète (host, port, user, password) — DigitalOcean l'affiche déjà au format `postgresql://user:pass@host:25060/dbname?sslmode=require`
6. Dans **Settings → Trusted Sources**, ajouter l'IP du VM LibyanSpider une fois celui-ci créé (§4) — restreint l'accès réseau à la base, ne pas laisser ouvert à tout Internet
7. Noter les deux `DATABASE_URL` (une par base) — servent en §7 et §8

---

## PARTIE 3 — Domaine (`tarhib.ly` chez LibyanSpider)

1. Sur libyanspider.com → **Domains** → rechercher `tarhib.ly` (ou le nom choisi) → l'enregistrer (40 LYD/an)
2. Ne pas configurer les DNS tout de suite — attendre d'avoir l'IP du VM (§4)
3. Une fois le VM créé, dans le panneau de gestion DNS de LibyanSpider, créer 3 enregistrements **A** :
   - `admin.tarhib.ly` → IP du VM
   - `api.tarhib.ly` → IP du VM
   - `auth.tarhib.ly` → IP du VM
4. Laisser le temps de propagation DNS (jusqu'à 24h, souvent quelques minutes en pratique)

---

## PARTIE 4 — VM (LibyanSpider VPS)

1. Sur libyanspider.com → **VPS Hosting** → plan **Recluse** (4 vCPU / 16 Go / 160 Go SSD)
2. Localisation : **Tripoli**
3. Système : **Ubuntu 22.04 LTS** (ou Debian 12 — les deux sont proposés, Ubuntu a l'écosystème Docker le mieux documenté)
4. Facturation trimestrielle en LYD (760 LYD/trimestre)
5. Récupérer l'IP publique du VM et l'accès root (SSH — clé publique à fournir à la commande si l'option existe, sinon mot de passe initial à changer immédiatement)
6. Retourner à la §3 pour finaliser les DNS avec cette IP

---

## PARTIE 5 — Préparation du serveur

Connexion initiale :

```bash
ssh root@<IP_DU_VM>
```

### 5.1 Mise à jour et utilisateur non-root

```bash
apt update && apt upgrade -y
adduser deploy
usermod -aG sudo deploy
# copier la clé SSH vers le nouvel utilisateur si connexion par clé
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

Se reconnecter ensuite en tant que `deploy` pour la suite (`ssh deploy@<IP_DU_VM>`).

### 5.2 Pare-feu

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Seuls SSH, HTTP (80, redirigé vers HTTPS par Caddy) et HTTPS (443) restent ouverts — PostgreSQL et Redis ne sont jamais exposés publiquement (Redis reste interne au réseau Docker, PostgreSQL est distant chez DigitalOcean avec Trusted Sources).

### 5.3 Docker + Docker Compose

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy
# se reconnecter pour que le groupe prenne effet
docker compose version   # vérifie que le plugin compose est bien inclus
```

### 5.4 Fail2ban (protection brute-force SSH, faible coût, bon réflexe)

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
```

---

## PARTIE 6 — Générer tous les secrets de production

**Ne jamais réutiliser un secret du `.env` de développement.** Générer :

```bash
# JWT_SECRET (backend)
openssl rand -base64 48

# KEYCLOAK_CLIENT_SECRET
openssl rand -base64 32

# KEYCLOAK_ADMIN_PASSWORD
openssl rand -base64 24
```

Noter ces 3 valeurs dans un gestionnaire de mots de passe (pas dans un fichier versionné) — elles servent dans les fichiers `.env` de production créés en §7-8.

---

## PARTIE 7 — Fichiers de déploiement

Créer un répertoire `/opt/tarhib` sur le VM, avec cette arborescence cible :

```
/opt/tarhib/
├── docker-compose.prod.yml
├── Caddyfile
├── backend.env          (secrets, jamais commité)
├── keycloak/
│   └── tarhib-realm.json   (copié depuis le repo)
└── web-admin-dist/         (build statique, déployé à chaque release)
```

### 7.1 `docker-compose.prod.yml`

```yaml
version: "3.9"

services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - ./web-admin-dist:/srv/web-admin:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend
      - keycloak

  redis:
    image: redis:7
    restart: unless-stopped
    # pas de port exposé à l'hôte — accessible uniquement depuis le réseau Docker interne

  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    restart: unless-stopped
    command: ["start", "--import-realm"]
    env_file: ./keycloak.env
    volumes:
      - ./keycloak:/opt/keycloak/data/import

  backend:
    build:
      context: . # voir §7.3 — construit depuis la racine du monorepo
      dockerfile: apps/backend/Dockerfile
    restart: unless-stopped
    env_file: ./backend.env
    depends_on:
      - redis
      - keycloak
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health/ready"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  caddy_data:
  caddy_config:
```

### 7.2 `Caddyfile`

```
admin.tarhib.ly {
    root * /srv/web-admin
    file_server
    try_files {path} /index.html   # SPA React — toute route inconnue retombe sur index.html
    encode gzip
}

api.tarhib.ly {
    reverse_proxy backend:3000
}

auth.tarhib.ly {
    reverse_proxy keycloak:8080
}
```

Caddy obtient et renouvelle automatiquement les certificats TLS Let's Encrypt pour les 3 sous-domaines — aucune config manuelle supplémentaire.

### 7.3 `apps/backend/Dockerfile` (à ajouter dans le repo)

Le repo est un monorepo npm workspaces piloté par Turborepo — `turbo prune` génère un sous-ensemble minimal du monorepo pour ce service, la façon correcte de construire une image Docker propre dans ce contexte :

```dockerfile
# syntax=docker/dockerfile:1

# ---- Étape 1 : élaguer le monorepo au strict nécessaire pour "backend" ----
FROM node:20.11.0-alpine AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune backend --docker

# ---- Étape 2 : installer les dépendances (couche mise en cache) ----
FROM node:20.11.0-alpine AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN npm ci

# ---- Étape 3 : build ----
FROM node:20.11.0-alpine AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
RUN npm run build -w apps/backend

# ---- Étape 4 : image finale, légère ----
FROM node:20.11.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache wget   # requis par le healthcheck du compose (§7.1)
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "apps/backend/dist/src/main"]
```

### 7.4 `backend.env` (sur le VM, jamais versionné)

```bash
DATABASE_URL=postgresql://<user>:<pass>@<host-do>:25060/tarhib?sslmode=require
REDIS_URL=redis://redis:6379
JWT_SECRET=<généré en §6>
KEYCLOAK_URL=http://keycloak:8080
KEYCLOAK_ADMIN_URL=http://keycloak:8080
KEYCLOAK_REALM=tarhib
KEYCLOAK_CLIENT_ID=tarhib-backend
KEYCLOAK_CLIENT_SECRET=<généré en §6>
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=<généré en §6>
FCM_SERVER_KEY=<depuis Firebase>
FIREBASE_SERVICE_ACCOUNT_JSON=<contenu JSON du compte de service Firebase, sur une ligne>
TWILIO_ACCOUNT_SID=<compte Twilio prod>
TWILIO_AUTH_TOKEN=<compte Twilio prod>
TWILIO_SENDER_ID=TARHIB
OTP_WHATSAPP_ENABLED=true
APP_URL=https://admin.tarhib.ly
CORS_ORIGIN=https://admin.tarhib.ly
PORT=3000
NODE_ENV=production
LOGIN_LOCK_DURATION_SECONDS=300
```

### 7.5 `keycloak.env`

```bash
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://<host-do>:25060/keycloak?sslmode=require
KC_DB_USERNAME=<user>
KC_DB_PASSWORD=<pass>
KC_HOSTNAME=auth.tarhib.ly
KC_PROXY=edge
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=<généré en §6>
```

### 7.6 SMS OTP — action avant d'aller plus loin

Avant de basculer `backend.env` en compte Twilio de production :

1. Vérifier le tarif SMS Twilio exact vers la Libye (`+218`) sur leur page de tarification actuelle
2. Confirmer `OTP_WHATSAPP_ENABLED=true` (déjà mis ci-dessus §7.4) pour privilégier WhatsApp — nettement moins cher que le SMS et large adoption en Libye
3. Estimer le volume réel attendu (~1-3 OTP/utilisateur/mois × 2000 = 2000-6000/mois) et chiffrer avant le lancement — potentiellement le poste de coût le plus élevé de tout le projet

---

## PARTIE 8 — Déployer Keycloak

```bash
cd /opt/tarhib
mkdir -p keycloak
# copier keycloak/tarhib-realm.json depuis le repo vers ce dossier (scp, git clone partiel, etc.)

docker compose -f docker-compose.prod.yml up -d keycloak
docker compose -f docker-compose.prod.yml logs -f keycloak
```

Vérifier dans les logs que le realm `tarhib` est bien importé et que la connexion à la base `keycloak` (DigitalOcean) réussit.

Dans la console admin Keycloak (`https://auth.tarhib.ly` une fois Caddy en place, §10), vérifier/régénérer le `KEYCLOAK_CLIENT_SECRET` du client `tarhib-backend` pour qu'il corresponde exactement à celui mis dans `backend.env`.

---

## PARTIE 9 — Déployer le backend

```bash
cd /opt/tarhib
docker compose -f docker-compose.prod.yml build backend
```

**Migrations avant le premier démarrage** — depuis une machine avec accès à `DATABASE_URL` (le VM ou en local avec le bon réseau autorisé) :

```bash
cd apps/backend
DATABASE_URL="postgresql://..." npm run migration:run
```

Puis démarrer :

```bash
docker compose -f docker-compose.prod.yml up -d redis backend
docker compose -f docker-compose.prod.yml logs -f backend
```

Vérifier :

```bash
curl http://localhost:3000/health/ready
# attendu : {"status":"ready","database":"ok","redis":"ok",...}
```

---

## PARTIE 10 — Déployer le web-admin

Depuis une machine de build (locale ou CI, pas nécessairement le VM lui-même) :

```bash
cd apps/web-admin
VITE_API_URL=https://api.tarhib.ly npm run build
```

Copier le contenu de `dist/` vers `/opt/tarhib/web-admin-dist/` sur le VM (`scp -r dist/* deploy@<IP>:/opt/tarhib/web-admin-dist/`).

---

## PARTIE 11 — Caddy (reverse proxy + TLS)

```bash
cd /opt/tarhib
docker compose -f docker-compose.prod.yml up -d caddy
docker compose -f docker-compose.prod.yml logs -f caddy
```

Vérifier que Caddy obtient bien les 3 certificats Let's Encrypt (les DNS de la §3 doivent déjà pointer vers le VM à ce stade). Tester :

```bash
curl -I https://admin.tarhib.ly
curl -I https://api.tarhib.ly/health/live
curl -I https://auth.tarhib.ly
```

---

## PARTIE 12 — Restreindre l'accès réseau à la base

Retourner dans DigitalOcean → **Trusted Sources** de la base → ajouter l'IP publique du VM LibyanSpider. Sans ça, la base reste accessible depuis n'importe quelle IP avec le bon mot de passe — à corriger avant l'ouverture réelle, pas après.

---

## PARTIE 13 — Test de bout en bout

1. Ouvrir `https://admin.tarhib.ly` → se connecter avec un compte seedé (ou en créer un via Keycloak admin + `npm run seed` adapté à la prod)
2. Créer une commande de test, vérifier son passage dans les statuts (PENDING → APPROVED → IN_PROGRESS → READY → DELIVERED)
3. Vérifier une notification SMS/WhatsApp OTP réelle vers un numéro `+218`
4. Vérifier `/health/ready` répond correctement en continu

**Test de charge avant l'ouverture réelle** (valider le dimensionnement de la VM) :

```bash
npx autocannon -c 100 -d 30 https://api.tarhib.ly/health/live
```

Ajuster si nécessaire avant d'inviter les 2000 utilisateurs.

---

## PARTIE 14 — Monitoring

1. Créer un compte UptimeRobot (gratuit)
2. Ajouter un moniteur HTTP sur `https://api.tarhib.ly/health/ready`, intervalle **1 minute**
3. Configurer une alerte email + SMS vers l'équipe technique en cas de panne

---

## PARTIE 15 — Sauvegardes

- **Base de données** : déjà automatique côté DigitalOcean (quotidienne, rétention selon le tier — vérifier dans le dashboard). **Tester une restauration une fois avant le lancement réel**, une sauvegarde jamais testée n'est pas fiable.
- **VM** : activer l'option de sauvegarde LibyanSpider (Acronis Cyber Protect Cloud) pour la config Caddy/Keycloak/Docker Compose — pas critique pour les données (elles sont sur DigitalOcean) mais évite de tout reconfigurer à la main en cas de perte du VM.

---

## PARTIE 16 — Applications mobiles

### 16.1 Lier les projets EAS

```bash
cd apps/mobile-employee && eas login && eas init
cd ../mobile-operations && eas init
```

### 16.2 Icônes et splash screen

Créer un icône 1024×1024 par app (branding vert `#55CFA8` pour Employee, bleu `#5B8CFF` pour Operations, cf. CLAUDE.md), les référencer dans chaque `app.json` (`icon`, `splash`).

### 16.3 Push notifications

- **Android** : créer un projet Firebase → générer `google-services.json` → `eas credentials` (Android) pour l'associer à chaque app
- **iOS** : laisser EAS gérer automatiquement la clé APNs (`eas credentials` avec gestion auto)

### 16.4 Mettre à jour `eas.json`

Les profils `preview`/`production` pointent déjà vers `https://api.tarhib.app` dans le repo actuel — **les corriger vers `https://api.tarhib.ly`** (nouveau domaine décidé §0) avant le premier build de prod.

### 16.5 Build

```bash
eas build --profile production --platform all
```

Pour chaque app (`mobile-employee`, `mobile-operations`).

### 16.6 Soumission

Compléter `submit.production` dans chaque `eas.json` (identifiants App Store Connect / compte de service Google Play), puis :

```bash
eas submit --platform ios
eas submit --platform android
```

Préparer en parallèle : captures d'écran, description AR/EN, politique de confidentialité (URL publique obligatoire), questionnaire de classification de contenu.

### 16.7 OTA (recommandé avant le lancement)

```bash
npx expo install expo-updates
```

Configurer `runtimeVersion` et `updates.url` dans chaque `app.json`, puis pour tout correctif JS-only après le lancement :

```bash
eas update --branch production
```

Évite de repasser par la review Apple/Google pour chaque correctif mineur — précieux la première semaine d'un vrai lancement.

---

## PARTIE 17 — Checklist finale avant d'ouvrir aux 2000 utilisateurs

- [ ] `/health/ready` répond `ready` en continu depuis plus de 24h
- [ ] Test de charge (§13) passé sans dégradation
- [ ] Restauration de sauvegarde DB testée au moins une fois (§15)
- [ ] Tarif Twilio Libye vérifié et budgété, WhatsApp activé par défaut (§7.6)
- [ ] Secrets de prod tous différents de ceux du dev (§6)
- [ ] `Trusted Sources` DigitalOcean restreint à l'IP du VM (§12)
- [ ] CORS_ORIGIN pointe vers le vrai domaine, pas `localhost`
- [ ] Monitoring actif avec alerte à 1 minute (§14)
- [ ] `eas.json` des 2 apps mobiles pointe vers `api.tarhib.ly` (§16.4)
- [ ] Apps mobiles soumises et approuvées (ou au moins en review) sur les 2 stores
- [ ] Icônes/splash configurés (pas les valeurs par défaut Expo)
- [ ] Politique de confidentialité publiée et accessible publiquement
- [ ] RTO documenté et communiqué à l'équipe (délai de restauration en cas de panne VM — §18, option A)

---

## PARTIE 18 — Disponibilité : décision à assumer

Avec cette architecture, **le VM LibyanSpider est un point de défaillance unique** pour web-admin + API + auth (la base, elle, reste protégée séparément chez DigitalOcean — voir §0).

| Option                                          | Effet                                                                                    | Coût additionnel |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------- |
| **A — Tel quel (recommandé pour démarrer)**     | Panne VM → indisponibilité du service (pas perte de données), restauration en ~15-30 min | 0 $              |
| **B — 2ᵉ VM en attente (cold standby)**         | Bascule manuelle en quelques minutes                                                     | +~26-47 $/mois   |
| **C — HA réelle (2 VM actifs + load balancer)** | Zéro interruption perçue                                                                 | +~50-70 $/mois   |

Démarrer en **option A**, avec un RTO documenté (ex. "30 minutes max"), et ne monter en B/C que si des incidents réels le justifient après quelques mois d'exploitation.

---

## ANNEXE A — Pourquoi cette architecture (comparatif complet)

### Pourquoi Libye + hybride plutôt que 100 % Hetzner/DigitalOcean ou 100 % LibyanSpider

| Critère                         | 100 % international (Hetzner+DO)                        | 100 % LibyanSpider                          | **Hybride (retenu)**                              |
| ------------------------------- | ------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| Coût/mois                       | ~45 $                                                   | ~48 $                                       | ~57 $                                             |
| Paiement                        | 100 % en devise étrangère                               | 100 % en LYD                                | 1 seul poste en devise étrangère (~30 $, la base) |
| Sauvegardes DB                  | Automatiques + PITR                                     | Manuelles (Acronis + scripts)               | Automatiques + PITR                               |
| Latence utilisateurs Libye      | Bonne (transit via l'Europe, probablement via l'Italie) | Optimale (Tripoli, zéro saut international) | Optimale (VM à Tripoli)                           |
| Exposition aux coupures locales | Aucune                                                  | Directe (VM **et** données)                 | VM oui, **données non**                           |

L'écart de coût entre les 3 options (~35-140 $/an) est faible comparé à l'incertitude sur le coût SMS (§7.6) — la décision se prend sur la facilité de paiement et la tolérance aux coupures locales, pas sur le prix pur.

### Dimensionnement — pourquoi 4 vCPU/16 Go et pas moins

2000 utilisateurs **inscrits** ≠ 2000 simultanés. Pour une app de commande de repas/boissons (usage concentré aux heures de repas) :

- Pic réaliste : ~20-30 % des utilisateurs actifs sur 15-30 min → **~400-600 sessions concurrentes**
- Débit au pic : **~50-150 requêtes/seconde**, largement dans les capacités d'une instance NestJS correctement dimensionnée
- Le plan Recluse (4 vCPU/16 Go) donne une marge confortable, pas juste le minimum viable

### Fournisseurs de repli si besoin de comparer

| Fournisseur     | VM équivalente (4 vCPU/8-16 Go) | PostgreSQL managée      |
| --------------- | ------------------------------- | ----------------------- |
| Hetzner Cloud   | ~12 $/mois (CX32)               | — (pas d'offre managée) |
| DigitalOcean    | ~48 $/mois                      | ~30 $/mois (tier 2 Go)  |
| AWS Bahreïn     | ~50-70 $/mois                   | RDS ~60-90 $/mois       |
| Azure UAE North | ~55-80 $/mois                   | ~65-100 $/mois          |

Bahreïn/UAE (~4-5x plus cher que l'hybride retenu) ne se justifient que si une contrainte réglementaire de résidence des données Moyen-Orient est confirmée — à vérifier auprès d'un conseil juridique si le secteur (bancaire, cf. données de seed "Al Waha Bank") l'exige explicitement.

### Ce qui fait varier le coût à la hausse plus tard

- Croissance au-delà de 2000 utilisateurs actifs → tier VM supérieur avant d'envisager un 2ᵉ VM de charge (distinct de la question de disponibilité, §18)
- Plusieurs sociétés clientes à fort volume simultané → upgrade PostgreSQL managée
- SMS OTP → le poste le plus susceptible de bouger vite, à suivre de près le premier mois
- Rythme de publication mobile élevé → upgrade EAS (~29 $/mois)
- Paiement international qui devient un obstacle après coup → bascule vers 100 % LibyanSpider (migration simple, containers Docker portables)
- Coupures locales fréquentes constatées à Tripoli → bascule du VM vers le site Allemagne de LibyanSpider ou vers Hetzner
