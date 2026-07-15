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
  | { provider: 'infobip-2fa'; pinId: string }
  | { provider: 'local-hash'; codeHash: string }
  | { provider: 'development' };

interface InfobipPinResponse {
  pinId?: string;
}

interface InfobipVerificationResponse {
  verified?: boolean;
}

@Injectable()
export class OtpDeliveryService {
  private readonly logger = new Logger(OtpDeliveryService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly applicationId: string;
  private readonly messageId: string;
  private readonly smsSender: string;
  private readonly whatsappSender: string;
  private readonly whatsappTemplate: string;
  private readonly whatsappLanguage: string;
  private readonly hashSecret: string;
  private readonly devCode: string | null;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config
      .get<string>('INFOBIP_BASE_URL', '')
      .replace(/\/$/, '');
    this.apiKey = config.get<string>('INFOBIP_API_KEY', '').trim();
    this.applicationId = config.get<string>('INFOBIP_2FA_APPLICATION_ID', '');
    this.messageId = config.get<string>('INFOBIP_2FA_MESSAGE_ID', '');
    this.smsSender = config.get<string>('INFOBIP_SMS_SENDER', '');
    this.whatsappSender = config.get<string>('INFOBIP_WHATSAPP_SENDER', '');
    this.whatsappTemplate = config.get<string>('INFOBIP_WHATSAPP_TEMPLATE', '');
    this.whatsappLanguage = config.get<string>(
      'INFOBIP_WHATSAPP_LANGUAGE',
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

    if (challenge.provider === 'local-hash') {
      return this.secureEqual(challenge.codeHash, this.hashOtp(to, code));
    }

    try {
      const response = await firstValueFrom(
        this.http.post<InfobipVerificationResponse>(
          `${this.baseUrl}/2fa/2/pin/${encodeURIComponent(challenge.pinId)}/verify`,
          { pin: code },
          { headers: this.headers() },
        ),
      );
      return response.data.verified === true;
    } catch (error) {
      const providerId = this.providerMessageId(error);
      if (
        this.providerStatus(error) === 404 ||
        providerId.includes('EXPIRED') ||
        providerId.includes('NOT_FOUND')
      ) {
        return false;
      }
      this.logger.error(
        `Infobip OTP check failed providerId=${providerId || 'unknown'} status=${this.providerStatus(error) ?? 'unknown'}`,
      );
      throw new ServiceUnavailableException('otpVerificationFailed');
    }
  }

  private async sendSms(to: string): Promise<OtpDeliveryChallenge> {
    if (!this.smsConfigured()) return this.developmentChallenge(to, 'sms');

    try {
      const response = await firstValueFrom(
        this.http.post<InfobipPinResponse>(
          `${this.baseUrl}/2fa/2/pin`,
          {
            applicationId: this.applicationId,
            messageId: this.messageId,
            from: this.smsSender,
            to: this.infobipPhone(to),
          },
          { headers: this.headers() },
        ),
      );
      if (!response.data.pinId) {
        throw new Error('Infobip response did not include pinId');
      }
      return { provider: 'infobip-2fa', pinId: response.data.pinId };
    } catch (error) {
      this.logDeliveryError('sms', error);
      throw new ServiceUnavailableException('otpDeliveryFailed');
    }
  }

  private async sendWhatsapp(to: string): Promise<OtpDeliveryChallenge> {
    if (!this.whatsappConfigured()) {
      return this.developmentChallenge(to, 'whatsapp');
    }

    const code = String(randomInt(100000, 1_000_000));
    try {
      await firstValueFrom(
        this.http.post(
          `${this.baseUrl}/whatsapp/1/message/template`,
          {
            messages: [
              {
                from: this.whatsappSender,
                to: this.infobipPhone(to),
                content: {
                  templateName: this.whatsappTemplate,
                  templateData: {
                    body: { placeholders: [code] },
                    buttons: [{ type: 'URL', parameter: code }],
                  },
                  language: this.whatsappLanguage,
                },
              },
            ],
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

  private smsConfigured(): boolean {
    return !!(
      this.baseUrl &&
      this.apiKey &&
      this.applicationId &&
      this.messageId &&
      this.smsSender
    );
  }

  private whatsappConfigured(): boolean {
    return !!(
      this.baseUrl &&
      this.apiKey &&
      this.whatsappSender &&
      this.whatsappTemplate &&
      this.hashSecret
    );
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `App ${this.apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private infobipPhone(phoneNumber: string): string {
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
      `Infobip OTP delivery failed channel=${channel} providerId=${this.providerMessageId(error) || 'unknown'} status=${this.providerStatus(error) ?? 'unknown'}`,
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
