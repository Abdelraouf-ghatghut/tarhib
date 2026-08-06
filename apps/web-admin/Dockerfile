# PR-1.9 — image de production du web-admin (React + Vite → nginx statique).
#
# Contexte de build = RACINE du repo (monorepo npm workspaces) :
#   docker build -f apps/web-admin/Dockerfile -t tarhib-web-admin .
#
# `vite build` seul (pas `npm run build`, qui enchaîne `tsc -b`) : `tsc -b`
# est un gate CI séparé (type-check strict) — vite build transpile via
# esbuild/rolldown sans bloquer sur des erreurs de type, cohérent avec la
# doc Vite elle-même (le type-check n'est pas requis pour produire un bundle
# fonctionnel). Ne dispense pas de corriger les erreurs tsc existantes.

FROM node:20.11.0-alpine AS base
WORKDIR /app
# Voir apps/backend/Dockerfile pour le détail — désactive proprement le hook
# "prepare": "husky" du package.json racine (pas de .git dans ce contexte).
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

FROM base AS build
RUN npm ci
COPY apps/web-admin apps/web-admin
# VITE_API_URL est inliné au build (Vite) — passer l'URL du backend de prod
# via --build-arg si elle diffère du défaut compilé dans lib/api.ts.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm exec -w apps/web-admin -- vite build

FROM nginx:1.27-alpine AS runtime
COPY apps/web-admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web-admin/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
