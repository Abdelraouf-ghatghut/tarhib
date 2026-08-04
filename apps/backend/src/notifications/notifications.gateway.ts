import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { Employee } from '../employees/entities/employee.entity.js';
import { isAllowedOrigin } from '../common/cors-origin.js';
import { createWsTokenVerifier } from './ws-auth.js';

interface SocketData {
  employeeId: string;
  companyId: string | null;
  branchId: string | null;
}

/**
 * NotificationsGateway — TARHIB-11
 * WebSocket gateway Socket.io pour les mises à jour SLA/commandes temps réel.
 * Namespace: /sla
 *
 * PR-0.6a : le handshake est authentifié (JWT vérifié contre le JWKS Keycloak,
 * identique à JwtStrategy) — une connexion sans token valide n'aboutit jamais
 * (connect_error, le socket n'est jamais admis) et ne rejoint donc aucune
 * room : plus de diffusion globale à un client anonyme.
 *
 * companyId/branchId sont RE-RÉSOLUS depuis la base (Employee), pas lus tels
 * quels dans le JWT — les claims custom du token peuvent être périmées si
 * l'affectation de l'employé a changé depuis son émission (E5).
 */
@Injectable()
@WebSocketGateway({
  namespace: '/sla',
  cors: {
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => cb(null, isAllowedOrigin(origin)),
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  afterInit(server: Server): void {
    const keycloakUrl = this.config.get<string>(
      'KEYCLOAK_ADMIN_URL',
      'http://localhost:8080',
    );
    const realm = this.config.get<string>('KEYCLOAK_REALM', 'tarhib');
    const verify = createWsTokenVerifier(
      `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
    );

    server.use((socket: Socket, next: (err?: Error) => void) => {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) {
        next(new Error('unauthorized'));
        return;
      }
      verify(token)
        .then(async ({ sub }) => {
          const employee = await this.employeeRepo.findOne({
            where: { keycloakId: sub },
          });
          if (!employee) {
            next(new Error('unauthorized'));
            return;
          }
          const data: SocketData = {
            employeeId: employee.id,
            companyId: employee.companyId,
            branchId: employee.branchId,
          };
          socket.data = data;
          next();
        })
        .catch((err: unknown) => {
          this.logger.warn(`Handshake WS rejeté : ${String(err)}`);
          next(new Error('unauthorized'));
        });
    });
  }

  handleConnection(socket: Socket): void {
    const data = socket.data as SocketData;
    const rooms = [`employee:${data.employeeId}`];
    if (data.companyId) rooms.push(`company:${data.companyId}`);
    if (data.branchId) rooms.push(`branch:${data.branchId}`);
    void socket.join(rooms);
  }

  /**
   * Émet un tick SLA — TARHIB-11, actuellement sans appelant (jamais invoquée
   * en production). Laissée en diffusion globale faute d'un site d'appel réel
   * pour déterminer le bon scope ; à corriger (room order/branch) dès qu'un
   * appelant est câblé plutôt que de deviner son scope maintenant.
   */
  emitSlaUpdate(
    orderId: string,
    remainingSeconds: number,
    priority: string,
  ): void {
    this.server.emit('sla:tick', { orderId, remainingSeconds, priority });
  }

  /**
   * Diffusion ciblée : la branche (file opérateurs/cuisine) ET l'employé
   * propriétaire (suivi "mes commandes") — jamais globale. Socket.IO dédoublonne
   * automatiquement si un même socket est membre des deux rooms.
   */
  emitOrderUpdate(
    event: 'order:new' | 'order:status',
    data: {
      orderId: string;
      status?: string;
      branchId: string;
      employeeId: string;
    },
  ): void {
    const rooms = [`branch:${data.branchId}`, `employee:${data.employeeId}`];
    this.server.to(rooms).emit(event, data);
  }

  @SubscribeMessage('subscribe:sla')
  handleSubscribe(@MessageBody() data: { orderId: string }) {
    return { event: 'subscribed', data: data.orderId };
  }
}
