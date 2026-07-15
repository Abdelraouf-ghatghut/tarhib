import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Twilio } from 'twilio';
import { Employee } from '../employees/entities/employee.entity.js';
import { Notification } from './entities/notification.entity.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * NotificationsService — TARHIB-9
 * SMS via Twilio (mock si TWILIO_ACCOUNT_SID absent).
 * FCM push via firebase-admin (mock si FIREBASE_SERVICE_ACCOUNT_JSON absent).
 *
 * Setup FCM : définir FIREBASE_SERVICE_ACCOUNT_JSON dans .env avec le contenu
 * JSON du compte de service Firebase (serviceAccountKey.json).
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly twilioClient: Twilio | null;
  private readonly twilioFrom: string | undefined;
  private fcmApp: unknown = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {
    const sid = config.get<string>('TWILIO_ACCOUNT_SID');
    const token = config.get<string>('TWILIO_AUTH_TOKEN');
    this.twilioFrom = config.get<string>('TWILIO_PHONE_NUMBER');

    if (sid && token) {
      this.twilioClient = new Twilio(sid, token);
      this.logger.log('Twilio SMS client initialized');
    } else {
      this.twilioClient = null;
      this.logger.warn('TWILIO_ACCOUNT_SID absent — SMS en mode mock');
    }

    this._initFcm();
  }

  private _initFcm(): void {
    const saJson = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!saJson) {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT_JSON absent — FCM en mode mock',
      );
      return;
    }
    try {
      // Dynamic require: firebase-admin is an optional peer dependency
      /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
      const admin = require('firebase-admin');
      const serviceAccount = JSON.parse(saJson) as object;
      this.fcmApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
      this.logger.log('Firebase Admin SDK initialized — FCM actif');
    } catch (err) {
      this.logger.warn(
        `Firebase Admin init failed (firebase-admin installé ? npm i firebase-admin) : ${String(err)}`,
      );
    }
  }

  /**
   * Envoie une notification FCM à un appareil.
   * Appelé après tout changement de statut de commande.
   */
  async sendPush(
    deviceToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.fcmApp) {
      this.logger.log(
        `[FCM-mock] → ${deviceToken.slice(0, 12)}… | ${title}: ${body}`,
      );
      return;
    }
    try {
      /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
      const admin = require('firebase-admin');
      await admin.messaging(this.fcmApp as any).send({
        token: deviceToken,
        notification: { title, body },
        data,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
      /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
      this.logger.log(`FCM push envoyé → ${deviceToken.slice(0, 12)}…`);
    } catch (err) {
      this.logger.error(`FCM push failed : ${String(err)}`);
    }
  }

  private async sendSms(to: string, body: string): Promise<void> {
    if (this.twilioClient && this.twilioFrom) {
      try {
        await this.twilioClient.messages.create({
          body,
          from: this.twilioFrom,
          to,
        });
        this.logger.log(`SMS envoyé à ${to}`);
      } catch (err) {
        this.logger.error(`Échec SMS à ${to}: ${String(err)}`);
      }
    } else {
      this.logger.log(`[SMS-mock] ${body} → ${to}`);
    }
  }

  /**
   * Notifie un employé précis (par ID) — utilisé par la chaîne de
   * validation des achats (§ التنبيهات) : responsable stock, validateur,
   * responsable achats. SMS si téléphone renseigné + push si FCM connu.
   */
  async notifyEmployee(
    employeeId: string,
    title: string,
    body: string,
    options?: {
      domain?: string;
      referenceId?: string;
      titleAr?: string;
      bodyAr?: string;
      data?: Record<string, string>;
    },
  ): Promise<void> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId },
    });
    if (!employee) {
      this.logger.warn(`notifyEmployee: employee ${employeeId} not found`);
      return;
    }
    await this.notificationRepo.save(
      this.notificationRepo.create({
        employeeId: employee.id,
        domain: options?.domain ?? 'general',
        titleAr: options?.titleAr ?? title,
        titleEn: title,
        bodyAr: options?.bodyAr ?? body,
        bodyEn: body,
        referenceId: options?.referenceId ?? null,
        data: options?.data ?? null,
        readAt: null,
      }),
    );
    await this.sendSms(employee.phoneNumber, `[Tarhib] ${title} — ${body}`);
    if (employee.fcmToken) {
      await this.sendPush(employee.fcmToken, title, body);
    }
  }

  async listForUser(user: JwtPayload): Promise<Notification[]> {
    const employee = await this.resolveEmployee(user);
    return this.notificationRepo.find({
      where: { employeeId: employee.id },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
  async markRead(id: string, user: JwtPayload): Promise<Notification> {
    const employee = await this.resolveEmployee(user);
    const notification = await this.notificationRepo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('notificationNotFound');
    if (notification.employeeId !== employee.id)
      throw new ForbiddenException('notificationOutsideScope');
    notification.readAt = new Date();
    return this.notificationRepo.save(notification);
  }
  async markAllRead(user: JwtPayload): Promise<void> {
    const employee = await this.resolveEmployee(user);
    await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('employee_id = :employeeId AND read_at IS NULL', {
        employeeId: employee.id,
      })
      .execute();
  }
  async notifyByPermission(
    permission: string,
    scope: { companyId?: string; branchId?: string },
    content: {
      domain: string;
      titleAr: string;
      titleEn: string;
      bodyAr: string;
      bodyEn: string;
      referenceId?: string;
      data?: Record<string, string>;
    },
  ): Promise<void> {
    const employees = await this.employeeRepo.find({
      where: {
        ...(scope.companyId ? { companyId: scope.companyId } : {}),
        ...(scope.branchId ? { branchId: scope.branchId } : {}),
        active: true,
      },
      relations: [
        'dynamicRole',
        'dynamicRole.permissions',
        'additionalRoles',
        'additionalRoles.permissions',
      ],
    });
    const targets = employees.filter((e) =>
      [
        ...(e.dynamicRole?.permissions ?? []),
        ...(e.additionalRoles ?? []).flatMap((r) => r.permissions ?? []),
      ].some((p) => p.key === permission),
    );
    await Promise.all(
      targets.map((e) =>
        this.notifyEmployee(e.id, content.titleEn, content.bodyEn, {
          ...content,
        }),
      ),
    );
  }
  private async resolveEmployee(user: JwtPayload): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: [{ id: user.employeeId ?? user.sub }, { keycloakId: user.sub }],
    });
    if (!employee) throw new NotFoundException('employeeNotFound');
    return employee;
  }

  /**
   * Notifie l'employé d'un changement de statut de commande.
   * Envoie un SMS via Twilio si configuré, sinon logue.
   * TARHIB-9
   */
  async notifyOrderStatusChanged(
    orderId: string,
    status: string,
    employeePhone: string,
  ): Promise<void> {
    const body = `[Tarhib] Commande #${orderId.slice(0, 8)} — nouveau statut : ${status}`;

    if (this.twilioClient && this.twilioFrom) {
      try {
        await this.twilioClient.messages.create({
          body,
          from: this.twilioFrom,
          to: employeePhone,
        });
        this.logger.log(
          `SMS envoyé à ${employeePhone} — ordre ${orderId} → ${status}`,
        );
      } catch (err) {
        this.logger.error(`Échec SMS ordre ${orderId}: ${String(err)}`);
      }
    } else {
      this.logger.log(`[SMS-mock] ${body} → ${employeePhone}`);
    }

    // FCM géré séparément via sendPush() par l'appelant (OrdersService, etc.)
  }

  /**
   * Notifie les gestionnaires d'un stock sous le seuil minimum.
   * TARHIB-42
   */
  async notifyLowStock(
    productId: string,
    branchId: string,
    quantity: number,
    managerPhone?: string,
  ): Promise<void> {
    const body = `[Tarhib] Alerte stock — produit ${productId.slice(0, 8)} (branche ${branchId.slice(0, 8)}) : ${quantity} unité(s) restante(s)`;

    this.logger.warn(
      `Low stock alert — product: ${productId}, branch: ${branchId}, qty: ${quantity}`,
    );

    if (managerPhone && this.twilioClient && this.twilioFrom) {
      try {
        await this.twilioClient.messages.create({
          body,
          from: this.twilioFrom,
          to: managerPhone,
        });
        this.logger.log(`SMS alerte stock envoyé à ${managerPhone}`);
      } catch (err) {
        this.logger.error(`Échec SMS alerte stock: ${String(err)}`);
      }
    } else {
      this.logger.log(`[SMS-mock] ${body}`);
    }
  }
}
