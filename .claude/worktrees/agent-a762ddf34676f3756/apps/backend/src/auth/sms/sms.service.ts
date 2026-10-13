import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly client: ReturnType<typeof twilio> | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const sid = config.get<string>('TWILIO_ACCOUNT_SID', '');
    const token = config.get<string>('TWILIO_AUTH_TOKEN', '');
    this.from = config.get<string>('TWILIO_FROM_NUMBER', '');
    // Client is null when credentials are absent (dev/test environment)
    this.client = sid && token ? twilio(sid, token) : null;
  }

  async send(to: string, body: string): Promise<void> {
    if (!this.client) {
      this.logger.warn(`[SMS mock] to=${to} | ${body}`);
      return;
    }
    await this.client.messages.create({ to, from: this.from, body });
  }
}
