import { MetricsService } from './metrics.service.js';

describe('MetricsService', () => {
  let metrics: MetricsService;

  beforeEach(() => {
    metrics = new MetricsService();
  });

  it('exposes Prometheus text format including our custom metric names', async () => {
    const text = await metrics.getMetrics();
    expect(text).toContain('http_request_duration_seconds');
    expect(text).toContain('http_requests_total');
    expect(text).toContain('db_query_duration_seconds');
    expect(text).toContain('redis_command_duration_seconds');
    expect(text).toContain('websocket_connected_clients');
    // collectDefaultMetrics (Node) — préfixe tarhib_ (app.module.ts/constructeur)
    expect(text).toContain('tarhib_process_cpu_user_seconds_total');
  });

  it('records HTTP request observations with labels', async () => {
    metrics.httpRequestDuration.observe(
      { method: 'GET', route: '/products', status_code: '200' },
      0.123,
    );
    metrics.httpRequestsTotal.inc({
      method: 'GET',
      route: '/products',
      status_code: '200',
    });
    const text = await metrics.getMetrics();
    expect(text).toContain('method="GET"');
    expect(text).toContain('route="/products"');
  });

  it('exposes a Prometheus-compliant content type', () => {
    expect(metrics.contentType).toContain('text/plain');
  });
});
