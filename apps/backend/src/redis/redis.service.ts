import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants.js';
import { MetricsService } from '../metrics/metrics.service.js';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT) private readonly client: Redis,
    private readonly metrics: MetricsService,
  ) {}

  /** PR-2.1 — observe durée/erreurs sans changer le comportement (les
   * erreurs restent propagées : chaque appelant gère déjà le best-effort,
   * cf. PR-0.5). */
  private async instrument<T>(
    command: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const start = process.hrtime.bigint();
    try {
      return await fn();
    } catch (err) {
      this.metrics.redisCommandErrorsTotal.inc({ command });
      throw err;
    } finally {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      this.metrics.redisCommandDuration.observe({ command }, seconds);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.instrument('get', () => this.client.get(key));
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.instrument('set', () =>
      this.client.set(key, value, 'EX', ttlSeconds),
    );
  }

  async del(key: string): Promise<void> {
    await this.instrument('del', () => this.client.del(key));
  }

  async incr(key: string): Promise<number> {
    return this.instrument('incr', () => this.client.incr(key));
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.instrument('expire', () => this.client.expire(key, ttlSeconds));
  }

  async ttl(key: string): Promise<number> {
    return this.instrument('ttl', () => this.client.ttl(key));
  }

  async ping(): Promise<string> {
    return this.instrument('ping', () => this.client.ping());
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
