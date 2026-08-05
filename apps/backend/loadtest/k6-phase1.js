// Premier test k6 (Phase 1, critère de sortie) — pics de déjeuner sur le
// VPS cible (4 vCPU/16 Go). Vise : 500 utilisateurs catalogue, 100 cmd/min,
// création p95<500ms/p99<1s.
//
// Pool d'identités : 7 employés client réels (seed-users.ts) + jusqu'à 80
// employés synthétiques (loadtest/seed-loadtest-employees.ts) — un premier
// run avec seulement les 7 réels avait mesuré p95=802ms/p99=2.85s en
// création, hypothèse principale = contention du verrou par employé
// (LOCK→DECIDE→WRITE, E1) artificiellement concentrée sur 7 identités
// partagées par 500 VUs. Ce pool élargi teste si l'hypothèse tient.
//
// Lancer (depuis la racine du repo, backend démarré en local sur :3000) :
//   docker run --rm -i -e BASE_URL=http://host.docker.internal:3000 \
//     -v "%CD%/apps/backend/loadtest:/scripts" grafana/k6 run /scripts/k6-phase1.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const PASSWORD = 'Tarhib@2026!';
const PRODUCT_ID = '8d221127-7b76-4015-82a9-dbb206a6b73f'; // Coffee (seed data)

// Nombre de comptes synthétiques loadtestN@alwaha-bank.ly à authentifier en
// plus des 7 réels — paramétrable pour respecter le throttle login
// (20/min/IP, cf. setup() qui les authentifie par lots).
const SYNTHETIC_EMPLOYEE_COUNT = parseInt(__ENV.SYNTHETIC_EMPLOYEES || '33', 10);
const LOGIN_BATCH_SIZE = 18; // marge sous le throttle réel de 20/min/IP
const LOGIN_BATCH_PAUSE_S = 62;

const REAL_CLIENT_EMPLOYEES = [
  'salma.alfaitouri@alwaha-bank.ly',
  'omar.alhouni@alwaha-bank.ly',
  'youssef.aburas@alwaha-bank.ly',
  'fatima.alzawi@alwaha-bank.ly',
  'mohamed.bensalem@alwaha-bank.ly',
  'hanan.alobeidi@alwaha-bank.ly',
  'abdullah.alzliteny@alwaha-bank.ly',
];
const SYNTHETIC_EMPLOYEES = Array.from(
  { length: SYNTHETIC_EMPLOYEE_COUNT },
  (_, i) => `loadtest${i}@alwaha-bank.ly`,
);
const CLIENT_EMPLOYEES = [...REAL_CLIENT_EMPLOYEES, ...SYNTHETIC_EMPLOYEES];

const orderCreateTrend = new Trend('order_create_duration', true);
const orderFailures = new Counter('order_create_failures');
const catalogFailures = new Counter('catalog_read_failures');

// Paramétrable via -e pour un smoke test rapide avant le run cible complet :
//   docker run ... grafana/k6 run -e CATALOG_VUS=3 -e ORDER_RATE=5 -e DURATION=10s /scripts/k6-phase1.js
const CATALOG_VUS = parseInt(__ENV.CATALOG_VUS || '500', 10);
const ORDER_RATE = parseInt(__ENV.ORDER_RATE || '100', 10);
const DURATION = __ENV.DURATION || '2m';

export const options = {
  // Défaut k6 = 60s — insuffisant dès que le pool d'identités dépasse le
  // throttle login (20/min/IP) et que setup() doit faire une pause.
  setupTimeout: '5m',
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

// setup() tourne une seule fois, hors VUs — respecte le throttle login réel
// (20/min/IP) en authentifiant par lots de LOGIN_BATCH_SIZE avec une pause
// entre chaque lot si le pool dépasse la limite.
export function setup() {
  const tokens = [];
  for (let i = 0; i < CLIENT_EMPLOYEES.length; i++) {
    if (i > 0 && i % LOGIN_BATCH_SIZE === 0) {
      sleep(LOGIN_BATCH_PAUSE_S);
    }
    const email = CLIENT_EMPLOYEES[i];
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
