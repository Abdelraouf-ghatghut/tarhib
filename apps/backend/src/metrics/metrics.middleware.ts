import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service.js';

/**
 * Middleware Express (pas un intercepteur Nest) — enregistré via app.use()
 * dans main.ts, donc AVANT les Guards. Un intercepteur ne voit jamais une
 * requête rejetée par un Guard (401 JwtAuthGuard, 403 PermissionsGuard, 429
 * AppThrottlerGuard) puisque les Guards s'exécutent avant les intercepteurs
 * dans le cycle de vie Nest — exactement le trafic le plus utile à observer
 * (tentatives d'authentification échouées, dépassements de throttle).
 */
function routeLabel(req: Request): string {
  const route = (req as unknown as { route?: { path?: string } }).route?.path;
  return route ?? req.path ?? 'unknown';
}

export function createMetricsMiddleware(metrics: MetricsService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      const labels = {
        method: req.method,
        route: routeLabel(req),
        status_code: String(res.statusCode),
      };
      metrics.httpRequestDuration.observe(labels, durationSeconds);
      metrics.httpRequestsTotal.inc(labels);
    });
    next();
  };
}
