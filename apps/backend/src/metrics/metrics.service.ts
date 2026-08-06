import { Injectable } from '@nestjs/common';
import {
  Registry,
  Histogram,
  Counter,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

/**
 * PR-2.1 — Métriques Prometheus (HTTP, Node, SQL, Redis, WebSocket) exposées
 * sur GET /metrics (voir MetricsController). Un seul registre process-wide :
 * pas de sens à avoir plusieurs instances de ce service.
 */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Durée des requêtes HTTP par méthode/route/code de statut',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });

  readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Nombre total de requêtes HTTP',
    labelNames: ['method', 'route', 'status_code'],
    registers: [this.registry],
  });

  readonly dbQueryDuration = new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Durée des requêtes SQL par type (SELECT/INSERT/UPDATE/DELETE/...)',
    labelNames: ['operation'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  readonly dbQueryErrorsTotal = new Counter({
    name: 'db_query_errors_total',
    help: 'Nombre de requêtes SQL en erreur',
    registers: [this.registry],
  });

  readonly redisCommandDuration = new Histogram({
    name: 'redis_command_duration_seconds',
    help: 'Durée des commandes Redis par type (get/set/del/...)',
    labelNames: ['command'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [this.registry],
  });

  readonly redisCommandErrorsTotal = new Counter({
    name: 'redis_command_errors_total',
    help: 'Nombre de commandes Redis en erreur (best-effort — jamais bloquant, cf. PR-0.5)',
    labelNames: ['command'],
    registers: [this.registry],
  });

  readonly websocketConnectedClients = new Gauge({
    name: 'websocket_connected_clients',
    help: 'Nombre de sockets actuellement connectées (namespace /sla)',
    registers: [this.registry],
  });

  readonly websocketEventsTotal = new Counter({
    name: 'websocket_events_emitted_total',
    help: "Nombre d'événements WebSocket émis par type",
    labelNames: ['event'],
    registers: [this.registry],
  });

  constructor() {
    // Node : CPU process, mémoire (RSS/heap), event loop lag, GC, handles actifs.
    collectDefaultMetrics({ register: this.registry, prefix: 'tarhib_' });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}
