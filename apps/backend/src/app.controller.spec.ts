import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';
import { RedisService } from './redis/redis.service.js';

async function buildController(opts: {
  dbOk?: boolean;
  redisOk?: boolean;
}): Promise<AppController> {
  const app: TestingModule = await Test.createTestingModule({
    controllers: [AppController],
    providers: [
      AppService,
      {
        provide: DataSource,
        useValue: {
          query:
            opts.dbOk === false
              ? jest.fn().mockRejectedValue(new Error('connection refused'))
              : jest.fn().mockResolvedValue([{ '?column?': 1 }]),
        },
      },
      {
        provide: RedisService,
        useValue: {
          ping:
            opts.redisOk === false
              ? jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))
              : jest.fn().mockResolvedValue('PONG'),
        },
      },
    ],
  }).compile();
  return app.get<AppController>(AppController);
}

describe('AppController', () => {
  describe('root', () => {
    it('should return "Hello World!"', async () => {
      const appController = await buildController({});
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  it('reports readiness when PostgreSQL and Redis respond', async () => {
    const appController = await buildController({});
    await expect(appController.ready()).resolves.toEqual(
      expect.objectContaining({ status: 'ready', database: 'ok', redis: 'ok' }),
    );
  });

  // PR-0.5 : Redis n'est pas la source de vérité — sa panne ne doit JAMAIS
  // faire échouer le readiness (sinon un orchestrateur redémarrerait le
  // backend en boucle pour une dépendance non critique).
  it('stays ready (degraded) when only Redis is unavailable', async () => {
    const appController = await buildController({ redisOk: false });
    await expect(appController.ready()).resolves.toEqual(
      expect.objectContaining({
        status: 'ready',
        database: 'ok',
        redis: 'degraded',
      }),
    );
  });

  // PostgreSQL reste la seule dépendance critique (source de vérité
  // commandes/stock/quotas) : sa panne DOIT faire échouer le readiness.
  it('fails readiness when PostgreSQL is unavailable', async () => {
    const appController = await buildController({ dbOk: false });
    await expect(appController.ready()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('fails readiness when PostgreSQL is down even if Redis is also down', async () => {
    const appController = await buildController({
      dbOk: false,
      redisOk: false,
    });
    await expect(appController.ready()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
