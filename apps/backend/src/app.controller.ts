import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator.js';
import { RedisService } from './redis/redis.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health/live')
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('health/ready')
  async ready() {
    // PostgreSQL est la seule dépendance qui rend le service réellement
    // indisponible (source de vérité — commandes/stock/quotas). Redis n'est
    // qu'un cache/best-effort (PR-0.5) : sa panne ne doit jamais faire échouer
    // le readiness ni déclencher un redémarrage par l'orchestrateur — elle est
    // juste rapportée en "degraded" pour la supervision.
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('databaseUnavailable');
    }

    const redisOk = await this.redis
      .ping()
      .then(() => true)
      .catch(() => false);

    return {
      status: 'ready',
      database: 'ok',
      redis: redisOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
    };
  }
}
