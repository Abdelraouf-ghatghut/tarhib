import { Logger as NestLogger } from '@nestjs/common';
import type { Logger } from 'typeorm';
import { MetricsService } from './metrics.service.js';

const SLOW_QUERY_WARN_MS = 200;

function operationOf(query: string): string {
  const word = query.trim().split(/\s+/, 1)[0]?.toUpperCase();
  return word && /^[A-Z]+$/.test(word) ? word : 'OTHER';
}

/**
 * PR-2.1/2.2 — observe la durée de (quasi) CHAQUE requête en abusant de
 * logQuerySlow : combiné à maxQueryExecutionTime:1 (app.module.ts — 0 est
 * falsy en JS et désactive silencieusement le hook côté TypeORM), TypeORM
 * appelle logQuerySlow dès qu'une requête dépasse 1ms avec sa durée réelle
 * en paramètre — logQuery seul ne donne jamais de durée. On ne fait
 * remonter un warning applicatif que pour les requêtes réellement lentes
 * (SLOW_QUERY_WARN_MS), la métrique elle-même couvre tout le trafic.
 */
export class TypeOrmMetricsLogger implements Logger {
  private readonly logger = new NestLogger('SlowQuery');

  constructor(private readonly metrics: MetricsService) {}

  logQuerySlow(time: number, query: string): void {
    this.metrics.dbQueryDuration.observe(
      { operation: operationOf(query) },
      time / 1000,
    );
    if (time > SLOW_QUERY_WARN_MS) {
      this.logger.warn(`${time}ms: ${query.slice(0, 300)}`);
    }
  }

  logQueryError(error: string | Error, query: string): void {
    this.metrics.dbQueryErrorsTotal.inc();
    this.logger.error(`${String(error)} — ${query.slice(0, 300)}`);
  }

  // Volontairement no-op : logQuerySlow (ci-dessus) couvre déjà la mesure de
  // TOUTES les requêtes ; dupliquer ici doublonnerait chaque requête dans
  // les métriques/logs sans bénéfice.
  logQuery(): void {}
  logMigration(message: string): void {
    this.logger.log(message);
  }
  logSchemaBuild(message: string): void {
    this.logger.log(message);
  }
  log(level: 'log' | 'info' | 'warn', message: unknown): void {
    if (level === 'warn') this.logger.warn(String(message));
    else this.logger.log(String(message));
  }
}
