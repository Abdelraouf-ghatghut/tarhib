import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { OtpChannel } from '../dto/otp-request.dto';

export type OtpDeliveryChallenge =
  | { provider: 'local-hash'; codeHash: string }
  | { provider: 'development' };

@Injectable()
export class OtpDeliveryService {
  private readonly logger = new Logger(OtpDeliveryService.name);
  private readonly graphVersion: string;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly whatsappTemplate: string;
  private readonly whatsappLanguage: string;
  private readonly hashSecret: string;
  private readonly devCode: string | null;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.graphVersion = config.get<string>('WHATSAPP_GRAPH_VERSION', 'v23.0');
    this.accessToken = config.get<string>('WHATSAPP_ACCESS_TOKEN', '').trim();
    this.phoneNumberId = config.get<string>('WHATSAPP_PHONE_NUMBER_ID', '').trim();
    this.whatsappTemplate = config.get<string>('WHATSAPP_OTP_TEMPLATE', '').trim();
    this.whatsappLanguage = config.get<string>(
      'WHATSAPP_TEMPLATE_LANGUAGE',
      'ar',
    );
    this.hashSecret = config.get<string>('OTP_HASH_SECRET', '');
    this.devCode =
      config.get<string>('NODE_ENV', 'development') === 'production'
        ? null
        : config.get<string>('OTP_DEV_CODE', '000000');
  }

  async send(to: string, channel: OtpChannel): Promise<OtpDeliveryChallenge> {
    if (channel === OtpChannel.SMS) return this.sendSms(to);
    return this.sendWhatsapp(to);
  }

  async check(
    to: string,
    code: string,
    challenge: OtpDeliveryChallenge,
  ): Promise<boolean> {
    if (challenge.provider === 'development') {
      if (!this.devCode) {
        throw new ServiceUnavailableException('otpProviderNotConfigured');
      }
      return code === this.devCode;
    }

    return this.secureEqual(challenge.codeHash, this.hashOtp(to, code));
  }

  private async sendSms(to: string): Promise<OtpDeliveryChallenge> {
    return this.developmentChallenge(to, 'sms-disabled');
  }

  private async sendWhatsapp(to: string): Promise<OtpDeliveryChallenge> {
    if (!this.whatsappConfigured()) {
      return this.developmentChallenge(to, 'whatsapp');
    }

    const code = String(randomInt(100000, 1_000_000));
    try {
      await firstValueFrom(
        this.http.post(
          `https://graph.facebook.com/${this.graphVersion}/${this.phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: this.whatsappPhone(to),
            type: 'template',
            template: {
              name: this.whatsappTemplate,
              language: { code: this.whatsappLanguage },
              components: [
                { type: 'body', parameters: [{ type: 'text', text: code }] },
                {
                  type: 'button',
                  sub_type: 'url',
                  index: '0',
                  parameters: [{ type: 'text', text: code }],
                },
              ],
            },
          },
          { headers: this.headers() },
        ),
      );
      return { provider: 'local-hash', codeHash: this.hashOtp(to, code) };
    } catch (error) {
      this.logDeliveryError('whatsapp', error);
      throw new ServiceUnavailableException('otpDeliveryFailed');
    }
  }

  private developmentChallenge(
    to: string,
    channel: string,
  ): OtpDeliveryChallenge {
    if (!this.devCode) {
      throw new ServiceUnavailableException('otpProviderNotConfigured');
    }
    this.logger.warn(
      `[OTP mock] channel=${channel} to=${this.maskPhone(to)} (development only)`,
    );
    return { provider: 'development' };
  }

  private whatsappConfigured(): boolean {
    return !!(
      this.accessToken &&
      this.phoneNumberId &&
      this.whatsappTemplate &&
      this.hashSecret
    );
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private whatsappPhone(phoneNumber: string): string {
    return phoneNumber.replace(/^\+/, '');
  }

  private hashOtp(phoneNumber: string, code: string): string {
    return createHmac('sha256', this.hashSecret)
      .update(`${phoneNumber}:${code}`)
      .digest('hex');
  }

  private secureEqual(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected, 'hex');
    const actualBuffer = Buffer.from(actual, 'hex');
    return (
      expectedBuffer.length === actualBuffer.length &&
      timingSafeEqual(expectedBuffer, actualBuffer)
    );
  }

  private maskPhone(phoneNumber: string): string {
    return `${phoneNumber.slice(0, 4)}••••${phoneNumber.slice(-2)}`;
  }

  private logDeliveryError(channel: string, error: unknown): void {
    this.logger.error(
      `WhatsApp Cloud OTP delivery failed channel=${channel} status=${this.providerStatus(error) ?? 'unknown'}`,
    );
  }

  private providerStatus(error: unknown): number | null {
    return isAxiosError(error) ? (error.response?.status ?? null) : null;
  }

  private providerMessageId(error: unknown): string {
    if (!isAxiosError(error)) return '';
    const data = error.response?.data as
      | {
          requestError?: { serviceException?: { messageId?: unknown } };
        }
      | undefined;
    const value = data?.requestError?.serviceException?.messageId;
    return typeof value === 'string' ? value : '';
  }
}
