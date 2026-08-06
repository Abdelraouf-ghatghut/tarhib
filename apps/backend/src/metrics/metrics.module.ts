import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service.js';
import { MetricsController } from './metrics.controller.js';

/**
 * Global (comme RedisModule) : RedisService, le logger TypeORM et
 * NotificationsGateway injectent MetricsService directement sans que leur
 * propre module ait besoin de déclarer un import explicite. Les métriques
 * HTTP sont enregistrées via un middleware Express (main.ts), pas un
 * intercepteur — voir metrics.middleware.ts pour le pourquoi.
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
