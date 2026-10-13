import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

/**
 * NotificationsService — TARHIB-9
 * SMS via Twilio (mock si TWILIO_ACCOUNT_SID absent).
 * FCM push : stub, à brancher quand firebase-admin sera installé.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly twilioClient: Twilio | null;
  private readonly twilioFrom: string | undefined;

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

    // TODO (FCM) : appeler Firebase Admin SDK quand firebase-admin est installé
    // await this.fcm.send({ token: deviceToken, notification: { title: 'Tarhib', body } });
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
