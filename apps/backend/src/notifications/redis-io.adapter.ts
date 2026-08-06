import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplicationContext, Logger } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

/**
 * Phase 3 — adaptateur Redis pour Socket.IO : sans lui, un événement émis
 * par emitOrderUpdate() sur l'instance backend A n'atteint jamais un socket
 * connecté à l'instance B (chaque process Socket.IO ne connaît que ses
 * propres sockets). Avec l'adaptateur, chaque instance publie/écoute sur un
 * canal Redis pub/sub commun — condition nécessaire pour faire tourner
 * plusieurs instances backend derrière un load balancer (le second item de
 * la Phase 3 redondance) sans perdre le temps réel pour la moitié des
 * clients connectés à l'autre instance.
 *
 * Connexions dédiées (pub + sub), séparées du client Redis applicatif
 * (redis.module.ts) : le pub/sub est un abonnement de longue durée, pas la
 * même sémantique que les commandes fail-fast request-scoped de l'app.
 */
export class RedisIoAdapter extends IoAdapter {
  private pubClient?: Redis;
  private subClient?: Redis;
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly redisUrl: string,
    private readonly logger: Logger,
  ) {
    super(app);
  }

  connectToRedis(): void {
    this.pubClient = new Redis(this.redisUrl);
    this.subClient = this.pubClient.duplicate();
    this.pubClient.on('error', (err: Error) =>
      this.logger.warn(`Socket.IO Redis adapter (pub) error: ${String(err)}`),
    );
    this.subClient.on('error', (err: Error) =>
      this.logger.warn(`Socket.IO Redis adapter (sub) error: ${String(err)}`),
    );
    this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options) as {
      adapter: (ctor: ReturnType<typeof createAdapter>) => void;
    };
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  async close(): Promise<void> {
    await this.pubClient?.quit();
    await this.subClient?.quit();
  }
}
