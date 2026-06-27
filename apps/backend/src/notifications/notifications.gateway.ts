import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

/**
 * NotificationsGateway — TARHIB-11
 * WebSocket gateway Socket.io pour les mises à jour SLA en temps réel.
 * Namespace: /sla
 */
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/sla' })
export class NotificationsGateway {
  @WebSocketServer()
  server!: Server;

  /**
   * Émet un tick SLA à tous les clients connectés au namespace /sla.
   * L'Agent d'Hospitalité reçoit le compte à rebours recalculé côté serveur.
   */
  emitSlaUpdate(
    orderId: string,
    remainingSeconds: number,
    priority: string,
  ): void {
    this.server.emit('sla:tick', { orderId, remainingSeconds, priority });
  }

  @SubscribeMessage('subscribe:sla')
  handleSubscribe(@MessageBody() data: { orderId: string }) {
    return { event: 'subscribed', data: data.orderId };
  }
}
