import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

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

  constructor(private readonly config: ConfigService) {
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
      const admin =
        require('firebase-admin') as typeof import('firebase-admin');
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
  ): Promise<void> {
    if (!this.fcmApp) {
      this.logger.log(
        `[FCM-mock] → ${deviceToken.slice(0, 12)}… | ${title}: ${body}`,
      );
      return;
    }
    try {
      /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
      const admin =
        require('firebase-admin') as typeof import('firebase-admin');
      await admin
        .messaging(this.fcmApp as ReturnType<typeof admin.initializeApp>)
        .send({
          token: deviceToken,
          notification: { title, body },
          android: { priority: 'high' },
          apns: { payload: { aps: { sound: 'default' } } },
        });
      /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
      this.logger.log(`FCM push envoyé → ${deviceToken.slice(0, 12)}…`);
    } catch (err) {
      this.logger.error(`FCM push failed : ${String(err)}`);
    }
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
