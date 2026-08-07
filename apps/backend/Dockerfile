# PR-1.9 — image de production du backend NestJS.
#
# Contexte de build = RACINE du repo (monorepo npm workspaces) :
#   docker build -f apps/backend/Dockerfile -t tarhib-backend .
# `npm ci` doit voir le package.json de chaque workspace déclaré dans
# package.json racine pour que le lockfile résolve correctement, même si
# seul apps/backend est réellement compilé/exécuté ici.

FROM node:22-alpine AS base
WORKDIR /app
# Le package.json racine déclare "prepare": "husky" — sans .git dans le
# contexte de build, husky se dégrade proprement (voir sa propre doc Docker/CI),
# SAUF sous --omit=dev où le binaire husky lui-même (devDependency) est absent
# et "sh -c husky" échoue en "command not found". HUSKY=0 désactive le hook
# proprement dans les deux cas, recommandé par husky pour CI/Docker.
ENV HUSKY=0
# Registre npm parfois instable derrière un proxy de build (ECONNRESET sur un
# `npm ci` de plusieurs minutes) — retries/timeouts plus généreux que le défaut.
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-factor 2 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web-admin/package.json apps/web-admin/package.json
COPY apps/mobile-employee/package.json apps/mobile-employee/package.json
COPY apps/mobile-operations/package.json apps/mobile-operations/package.json
COPY packages/i18n/package.json packages/i18n/package.json
COPY packages/mobile-shared/package.json packages/mobile-shared/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

FROM base AS deps
RUN npm ci

FROM deps AS build
COPY apps/backend apps/backend
RUN npm run build -w apps/backend

FROM base AS prod-deps
RUN npm pkg delete scripts.prepare && npm ci --omit=dev

# Image finale : seuls dist/ + node_modules de prod, jamais les sources TS
# ni les devDependencies (nest-cli, typescript, jest, eslint...).
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S tarhib && adduser -S tarhib -G tarhib
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY apps/backend/package.json ./package.json
USER tarhib
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health/live',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
# dist/src/main.js, pas dist/main.js : tsconfig.json n'a pas de rootDir
# explicite et compile aussi scripts/ (seed-users.ts) en plus de src/, donc
# TypeScript infère la racine commune comme le dossier backend lui-même et
# préserve la structure src/ sous dist/. Vérifié par un vrai `npm run build`
# + inspection de l'arbre dist/ généré (pas deviné).
CMD ["node", "dist/src/main.js"]
