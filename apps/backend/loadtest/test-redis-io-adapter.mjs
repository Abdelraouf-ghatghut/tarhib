// Phase 3 - real cross-instance test for the Socket.IO Redis adapter.
// Connects a WS client to instance A (:3000), creates an order via instance
// B (:3001) for the same employee, and confirms the 'order:new' event
// reaches the socket on A - proof the Redis pub/sub bridge actually works,
// not just that the code compiles.
import { io } from 'socket.io-client';

const INSTANCE_A = 'http://localhost:3000';
const INSTANCE_B = 'http://localhost:3001';
const EMAIL = 'loadtest1@alwaha-bank.ly';
const PASSWORD = 'Tarhib@2026!';
const PRODUCT_ID = '8d221127-7b76-4015-82a9-dbb206a6b73f'; // Coffee

async function login(baseUrl) {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const { accessToken } = await login(INSTANCE_A);

  const received = [];
  const socket = io(`${INSTANCE_A}/sla`, {
    transports: ['websocket'],
    auth: (cb) => cb({ token: accessToken }),
  });

  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
  });
  console.log('Connected to instance A (:3000)');

  socket.on('order:new', (data) => {
    received.push(data);
    console.log('Received order:new on instance A socket:', data.orderId);
  });

  console.log('Creating order via instance B (:3001)...');
  const orderRes = await fetch(`${INSTANCE_B}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      lines: [{ productId: PRODUCT_ID, quantity: 1 }],
      clientRequestId: crypto.randomUUID(),
    }),
  });
  if (!orderRes.ok) {
    throw new Error(`order creation failed: ${orderRes.status} ${await orderRes.text()}`);
  }
  const order = await orderRes.json();
  console.log('Order created on instance B:', order.id);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  socket.close();

  if (received.length === 0) {
    console.error('FAIL: no order:new event received on instance A after order created on instance B');
    process.exit(1);
  }
  if (received[0].orderId !== order.id) {
    console.error('FAIL: received event does not match the created order');
    process.exit(1);
  }
  console.log('PASS: Redis adapter correctly bridged the event from instance B to instance A');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
