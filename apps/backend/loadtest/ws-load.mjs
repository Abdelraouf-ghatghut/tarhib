// Charge WebSocket (Phase 1, critère de sortie : 500-800 sockets) — k6 ne
// parle pas le protocole Socket.IO (Engine.IO framing par-dessus WS), donc
// un harnais séparé avec le vrai client socket.io-client, identique à ce
// que font les apps mobiles (packages/mobile-shared/src/realtime.ts).
//
// Usage : node loadtest/ws-load.mjs [count] [holdSeconds]
//   BASE_URL=http://localhost:3000 node loadtest/ws-load.mjs 600 90

import { io } from 'socket.io-client';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PASSWORD = 'Tarhib@2026!';
const COUNT = parseInt(process.argv[2] || '600', 10);
const HOLD_SECONDS = parseInt(process.argv[3] || '60', 10);

const CLIENT_EMPLOYEES = [
  'salma.alfaitouri@alwaha-bank.ly',
  'omar.alhouni@alwaha-bank.ly',
  'youssef.aburas@alwaha-bank.ly',
  'fatima.alzawi@alwaha-bank.ly',
  'mohamed.bensalem@alwaha-bank.ly',
  'hanan.alobeidi@alwaha-bank.ly',
  'abdullah.alzliteny@alwaha-bank.ly',
];

async function login(email) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed for ${email}: ${res.status}`);
  const body = await res.json();
  return body.accessToken;
}

async function main() {
  console.log(`Authenticating ${CLIENT_EMPLOYEES.length} accounts...`);
  const tokens = [];
  for (const email of CLIENT_EMPLOYEES) {
    tokens.push(await login(email));
  }

  let connected = 0;
  let failed = 0;
  let closedEarly = 0;
  const connectDurations = [];
  const sockets = [];

  console.log(`Opening ${COUNT} WebSocket connections to ${BASE_URL}/sla ...`);
  const start = Date.now();

  await Promise.all(
    Array.from({ length: COUNT }, (_, i) => {
      const token = tokens[i % tokens.length];
      return new Promise((resolve) => {
        const attemptStart = Date.now();
        const socket = io(`${BASE_URL}/sla`, {
          transports: ['websocket'],
          auth: (cb) => cb({ token }),
          reconnection: false,
          timeout: 20_000,
        });
        sockets.push(socket);
        socket.on('connect', () => {
          connected++;
          connectDurations.push(Date.now() - attemptStart);
          resolve();
        });
        socket.on('connect_error', (err) => {
          failed++;
          console.error(`connect_error on socket ${i}: ${err.message}`);
          resolve();
        });
        socket.on('disconnect', (reason) => {
          if (Date.now() - start < HOLD_SECONDS * 1000 - 2000) {
            closedEarly++;
            console.error(`socket ${i} disconnected early: ${reason}`);
          }
        });
      });
    }),
  );

  const openMs = Date.now() - start;
  connectDurations.sort((a, b) => a - b);
  const p50 = connectDurations[Math.floor(connectDurations.length * 0.5)] ?? 0;
  const p95 = connectDurations[Math.floor(connectDurations.length * 0.95)] ?? 0;

  console.log(
    `Connected ${connected}/${COUNT} in ${openMs}ms (connect duration p50=${p50}ms p95=${p95}ms), ${failed} failed`,
  );
  console.log(`Holding connections for ${HOLD_SECONDS}s...`);
  await new Promise((resolve) => setTimeout(resolve, HOLD_SECONDS * 1000));

  console.log(
    `After hold: ${connected - closedEarly}/${connected} still connected (${closedEarly} closed early)`,
  );

  for (const s of sockets) s.close();
  process.exit(failed > 0 || closedEarly > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
