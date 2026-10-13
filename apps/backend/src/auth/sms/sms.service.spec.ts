import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { OtpChannel } from '../dto/otp-request.dto';
import { OtpDeliveryService } from './sms.service';

const CONFIG: Record<string, string> = {
  NODE_ENV: 'test',
  WHATSAPP_GRAPH_VERSION: 'v23.0',
  WHATSAPP_ACCESS_TOKEN: 'meta-access-token',
  WHATSAPP_PHONE_NUMBER_ID: '123456789',
  WHATSAPP_OTP_TEMPLATE: 'tarhib_registration_otp',
  WHATSAPP_TEMPLATE_LANGUAGE: 'ar',
  OTP_HASH_SECRET: 'test-hash-secret',
  OTP_DEV_CODE: '000000',
};

const build = (values: Record<string, string> = CONFIG) => {
  const http = {
    post: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string, fallback: string) => values[key] ?? fallback),
  };
  return {
    service: new OtpDeliveryService(
      http as unknown as HttpService,
      config as unknown as ConfigService,
    ),
    http,
  };
};

describe('OtpDeliveryService (Meta WhatsApp Cloud API)', () => {
  it('sends a WhatsApp authentication template and verifies its local hash', async () => {
    const { service, http } = build();
    http.post.mockReturnValue(
      of({ data: { messages: [{ status: 'PENDING' }] } }),
    );

    const challenge = await service.send('+33782201206', OtpChannel.WHATSAPP);
    expect(challenge.provider).toBe('local-hash');

    const body = (http.post.mock.calls as unknown[][])[0]?.[1] as {
      template: {
        components: Array<{
          type: string;
          parameters: Array<{ text: string }>;
        }>;
      };
    };
    const code = body.template.components[0]?.parameters[0]?.text;
    expect(code).toMatch(/^\d{6}$/);
    expect(http.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v23.0/123456789/messages',
      expect.objectContaining({
        messaging_product: 'whatsapp',
        to: '33782201206',
        type: 'template',
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer meta-access-token',
        }) as unknown,
      }),
    );
    await expect(service.check('+33782201206', code, challenge)).resolves.toBe(
      true,
    );
    await expect(
      service.check('+33782201206', '000000', challenge),
    ).resolves.toBe(false);
  });

  it('keeps the development fallback when Infobip is not configured', async () => {
    const { service, http } = build({
      NODE_ENV: 'development',
      OTP_DEV_CODE: '123456',
    });

    const challenge = await service.send('+33782201206', OtpChannel.SMS);
    expect(challenge).toEqual({ provider: 'development' });
    expect(http.post).not.toHaveBeenCalled();
    await expect(
      service.check('+33782201206', '123456', challenge),
    ).resolves.toBe(true);
  });
});
