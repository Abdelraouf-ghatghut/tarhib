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
import {
  AccessPolicyService,
  type DataScope,
} from '../access/access-policy.service.js';
import { AccessCacheService } from '../access/access-cache.service.js';

interface SocketData {
  employeeId: string;
  companyId: string | null;
  branchId: string | null;
  /** GLOBAL/COMPANY : détermine les rooms manager: additionnelles (PR-0.6b) —
   * BRANCH n'ajoute rien de plus que la room `branch:` déjà rejointe par
   * quiconque dans cette branche. */
  dataScope?: DataScope;
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
    private readonly accessPolicy: AccessPolicyService,
    private readonly accessCache: AccessCacheService,
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
            relations: ['additionalRoles'],
          });
          if (!employee) {
            next(new Error('unauthorized'));
            return;
          }
          // dataScope détermine les rooms manager: (PR-0.6b). Lecture cache-first
          // (PR-1.0, réduit la charge DB lors d'une reconnexion en masse — E6) ;
          // sur un miss, résolution directe SANS écriture dans le cache : cette
          // lecture ne construit que {permissions,dataScope}, pas le profil complet
          // qu'écrit JwtStrategy — y écrire une entrée partielle corromprait le
          // profil que lirait ensuite une requête HTTP pour ce même employé.
          const cached = await this.accessCache.get(sub);
          const dataScope = cached
            ? cached.dataScope
            : (await this.accessPolicy.resolve(employee)).dataScope;
          const data: SocketData = {
            employeeId: employee.id,
            companyId: employee.companyId,
            branchId: employee.branchId,
            dataScope,
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
    // PR-0.6b : un superviseur société/plateforme n'appartient pas forcément
    // à UNE branche unique — sans ces rooms, il ne verrait aucun événement de
    // commande en dehors de sa propre branche (voire aucune du tout s'il n'en
    // a pas). BRANCH n'ajoute rien : la room `branch:` ci-dessus suffit déjà.
    if (data.dataScope === 'GLOBAL') {
      rooms.push('manager:global');
    } else if (data.dataScope === 'COMPANY' && data.companyId) {
      rooms.push(`manager:company:${data.companyId}`);
    }
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
   * Diffusion ciblée : la branche (file opérateurs/cuisine), l'employé
   * propriétaire (suivi "mes commandes"), et les superviseurs société/
   * plateforme (PR-0.6b) — jamais globale à tous les clients connectés.
   * Cible les 4 rooms inconditionnellement : Socket.IO dédoublonne pour un
   * socket membre de plusieurs, et cibler une room sans membre est un no-op
   * — l'appartenance décidée à la connexion (handleConnection) fait le tri,
   * pas cette méthode.
   */
  emitOrderUpdate(
    event: 'order:new' | 'order:status',
    data: {
      orderId: string;
      status?: string;
      branchId: string;
      employeeId: string;
      companyId: string;
    },
  ): void {
    const rooms = [
      `branch:${data.branchId}`,
      `employee:${data.employeeId}`,
      `manager:company:${data.companyId}`,
      'manager:global',
    ];
    this.server.to(rooms).emit(event, data);
  }

  @SubscribeMessage('subscribe:sla')
  handleSubscribe(@MessageBody() data: { orderId: string }) {
    return { event: 'subscribed', data: data.orderId };
  }
}
