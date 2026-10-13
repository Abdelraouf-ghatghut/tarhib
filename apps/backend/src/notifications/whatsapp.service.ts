import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async sendNotification(to: string, title: string, body: string): Promise<void> {
    const version = this.config.get<string>('WHATSAPP_GRAPH_VERSION', 'v23.0');
    const accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN', '').trim();
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID', '').trim();
    const template = this.config
      .get<string>('WHATSAPP_NOTIFICATION_TEMPLATE', '')
      .trim();
    const language = this.config.get<string>('WHATSAPP_TEMPLATE_LANGUAGE', 'ar');

    if (!accessToken || !phoneNumberId || !template) {
      this.logger.debug('WhatsApp business notification skipped: provider not configured');
      return;
    }

    try {
      await firstValueFrom(
        this.http.post(
          `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to.replace(/^\+/, ''),
            type: 'template',
            template: {
              name: template,
              language: { code: language },
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: title },
                    { type: 'text', text: body },
                  ],
                },
              ],
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        ),
      );
    } catch (error) {
      // A notification provider outage must not roll back the business action.
      this.logger.error(`WhatsApp business notification failed: ${String(error)}`);
    }
  }
}
