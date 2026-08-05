// Premier test k6 (Phase 1, critère de sortie) — pics de déjeuner sur le
// VPS cible (4 vCPU/16 Go). Vise : 500 utilisateurs catalogue, 100 cmd/min,
// création p95<500ms/p99<1s.
//
// LIMITE CONNUE : le pool de comptes seedés (scripts/seed-users.ts) ne
// contient que 7 employés client habilités à commander — les 500 VUs
// catalogue et les commandes réutilisent donc ce pool au lieu de 500
// identités distinctes. C'est en fait un test PLUS PESSIMISTE pour la
// contention de verrou par (employeeId, produit, période) qu'un vrai parc
// de 500 employés (E1 — verrou total quota→stock), donc les p95/p99 mesurés
// ici sont un majorant raisonnable, pas une sous-estimation. Voir le rapport
// de run pour le détail.
//
// Lancer (depuis la racine du repo, backend démarré en local sur :3000) :
//   docker run --rm -i --network host -e BASE_URL=http://localhost:3000 \
//     -v "%CD%/apps/backend/loadtest:/scripts" grafana/k6 run /scripts/k6-phase1.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const PASSWORD = 'Tarhib@2026!';
const PRODUCT_ID = '8d221127-7b76-4015-82a9-dbb206a6b73f'; // Coffee (seed data)

const CLIENT_EMPLOYEES = [
  'salma.alfaitouri@alwaha-bank.ly',
  'omar.alhouni@alwaha-bank.ly',
  'youssef.aburas@alwaha-bank.ly',
  'fatima.alzawi@alwaha-bank.ly',
  'mohamed.bensalem@alwaha-bank.ly',
  'hanan.alobeidi@alwaha-bank.ly',
  'abdullah.alzliteny@alwaha-bank.ly',
];

const orderCreateTrend = new Trend('order_create_duration', true);
const orderFailures = new Counter('order_create_failures');
const catalogFailures = new Counter('catalog_read_failures');

// Paramétrable via -e pour un smoke test rapide avant le run cible complet :
//   docker run ... grafana/k6 run -e CATALOG_VUS=3 -e ORDER_RATE=5 -e DURATION=10s /scripts/k6-phase1.js
const CATALOG_VUS = parseInt(__ENV.CATALOG_VUS || '500', 10);
const ORDER_RATE = parseInt(__ENV.ORDER_RATE || '100', 10);
const DURATION = __ENV.DURATION || '2m';

export const options = {
  scenarios: {
    catalog_browse: {
      executor: 'constant-vus',
      vus: CATALOG_VUS,
      duration: DURATION,
      exec: 'catalogBrowse',
    },
    order_creation: {
      executor: 'constant-arrival-rate',
      rate: ORDER_RATE,
      timeUnit: '1m',
      duration: DURATION,
      preAllocatedVUs: 30,
      maxVUs: 80,
      exec: 'createOrder',
      startTime: '5s', // laisse catalog_browse ouvrir ses VUs d'abord
    },
  },
  thresholds: {
    order_create_duration: ['p(95)<500', 'p(99)<1000'],
    order_create_failures: ['count<20'], // tolère quelques 409 idempotence/quota en bord de test
  },
};

// setup() tourne une seule fois, hors VUs — respecte le throttle login
// (20/min/IP) : 7 logins, largement en dessous.
export function setup() {
  const tokens = [];
  for (const email of CLIENT_EMPLOYEES) {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email, password: PASSWORD }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    if (res.status !== 200) {
      throw new Error(`login failed for ${email}: ${res.status} ${res.body}`);
    }
    const body = JSON.parse(res.body);
    tokens.push(body.accessToken);
  }
  return { tokens };
}

function pickToken(data) {
  return data.tokens[Math.floor(Math.random() * data.tokens.length)];
}

// Le backend valide clientRequestId avec @IsUUID() — un format v4 correct
// est requis, Math.random suffit (pas besoin de vraie entropie crypto ici).
function fakeUuidV4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function catalogBrowse(data) {
  const headers = { Authorization: `Bearer ${pickToken(data)}` };
  const res = http.get(`${BASE_URL}/products/version`, { headers });
  const ok = check(res, { 'catalog version 200': (r) => r.status === 200 });
  if (!ok) catalogFailures.add(1);
  sleep(1 + Math.random() * 2); // think-time réaliste entre deux consultations
}

export function createOrder(data) {
  const headers = {
    Authorization: `Bearer ${pickToken(data)}`,
    'Content-Type': 'application/json',
  };
  const payload = JSON.stringify({
    lines: [{ productId: PRODUCT_ID, quantity: 1 }],
    // clientRequestId unique par tentative (jamais un retry ici) — chaque
    // itération est une commande réellement distincte.
    clientRequestId: fakeUuidV4(),
  });
  const res = http.post(`${BASE_URL}/orders`, payload, { headers });
  orderCreateTrend.add(res.timings.duration);
  const ok = check(res, { 'order created (201)': (r) => r.status === 201 });
  if (!ok) orderFailures.add(1);
}
