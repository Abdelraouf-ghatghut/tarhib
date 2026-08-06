import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator.js';
import { MetricsService } from './metrics.service.js';

/**
 * PR-2.1 — Format texte Prometheus, prévu pour un scrape interne (Prometheus
 * lui-même n'envoie pas de JWT). @Public() ici est délibéré, pas un oubli :
 * la protection réelle en production doit venir du réseau (pare-feu VPS/
 * reverse proxy n'autorisant que l'IP du collecteur), documenté dans
 * PRODUCTION_RUNBOOK.md — jamais exposé sur l'internet public.
 */
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Public()
  @Get()
  async getMetrics(@Res({ passthrough: true }) res: Response): Promise<string> {
    res.set('Content-Type', this.metrics.contentType);
    return this.metrics.getMetrics();
  }
}
