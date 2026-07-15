const baseUrl = process.env.API_URL ?? 'http://localhost:3000';
const path = process.env.LOAD_PATH ?? '/health/ready';
const concurrency = Math.max(1, Number(process.env.LOAD_CONCURRENCY ?? 20));
const requests = Math.max(concurrency, Number(process.env.LOAD_REQUESTS ?? 500));
const token = process.env.ACCESS_TOKEN;
const latencies = [];
let failures = 0;

async function worker(count) {
  for (let index = 0; index < count; index += 1) {
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (!response.ok) failures += 1;
      await response.arrayBuffer();
    } catch {
      failures += 1;
    } finally {
      latencies.push(performance.now() - started);
    }
  }
}

const started = performance.now();
await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(Math.floor(requests / concurrency) + (index < requests % concurrency ? 1 : 0))));
latencies.sort((a, b) => a - b);
const percentile = (value) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * value))] ?? 0;
const durationMs = performance.now() - started;
const result = { requests, concurrency, failures, durationMs: Math.round(durationMs), requestsPerSecond: Math.round((requests * 1000) / durationMs), p50Ms: Math.round(percentile(0.5)), p95Ms: Math.round(percentile(0.95)), p99Ms: Math.round(percentile(0.99)) };
console.log(JSON.stringify(result, null, 2));
if (failures > 0 || result.p95Ms > Number(process.env.LOAD_MAX_P95_MS ?? 1000)) process.exit(1);
