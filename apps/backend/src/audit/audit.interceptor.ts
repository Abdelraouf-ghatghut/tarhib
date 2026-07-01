import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import { AuditService } from './audit.service.js';

/**
 * Intercepte les requêtes mutantes (POST/PATCH/PUT/DELETE)
 * et écrit une entrée dans audit_logs après la complétion.
 * Ne bloque jamais la réponse — les erreurs d'écriture sont ignorées.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req: Request = ctx.switchToHttp().getRequest();
    const method = req.method?.toUpperCase();

    // Seules les actions mutantes sont auditées
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = (
      req as unknown as {
        user?: { sub?: string; email?: string; role?: string };
      }
    ).user;
    if (!user?.sub) return next.handle();

    return next.handle().pipe(
      tap({
        next: () => {
          const url = req.url ?? '';
          const entity = this.extractEntity(url);
          const entityId =
            (req.params as Record<string, string>)?.['id'] ?? null;
          const action = `${method}:${entity.toUpperCase()}`;

          this.auditService
            .log({
              userId: user.sub!,
              userEmail: user.email ?? null,
              action,
              entity,
              entityId: entityId ?? null,
              metadata: {
                url,
                body: this.sanitizeBody(req.body as Record<string, unknown>),
              },
              ipAddress: req.ip ?? null,
            })
            .catch(() => void 0);
        },
      }),
    );
  }

  private extractEntity(url: string): string {
    // /api/orders/123/status → 'orders'
    const segments = url
      .replace(/^\/api\//, '')
      .split('/')
      .filter(Boolean);
    return segments[0] ?? 'unknown';
  }

  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body || typeof body !== 'object') return {};
    const REDACTED = new Set(['password', 'token', 'fcmToken']);
    return Object.fromEntries(
      Object.entries(body).filter(([k]) => !REDACTED.has(k)),
    );
  }
}
