import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service.js';
import { REDIS_CLIENT } from './redis.constants.js';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      // Redis n'est jamais la source de vérité (§ PR-0.5) : ces réglages font
      // qu'une panne Redis ÉCHOUE VITE (commande rejetée en ~2s max) plutôt
      // que de faire pendre les requêtes indéfiniment — les valeurs par défaut
      // d'ioredis (enableOfflineQueue:true, maxRetriesPerRequest:20) mettent en
      // file d'attente et retentent longuement, ce qui bloquerait toute requête
      // authentifiée (JwtStrategy) derrière un Redis indisponible.
      useFactory: (config: ConfigService) =>
        new Redis(config.get<string>('REDIS_URL', 'redis://localhost:6379'), {
          connectTimeout: 2000,
          commandTimeout: 2000,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          // Backoff borné avec jitter pour la reconnexion TCP en arrière-plan —
          // ne s'arrête jamais (retourner null figerait la connexion), mais ne
          // martèle pas non plus le serveur pendant une panne prolongée.
          retryStrategy: (times: number) =>
            Math.min(times * 100, 3000) + Math.floor(Math.random() * 200),
        }),
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
