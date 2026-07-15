import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { OtpChannel } from '../dto/otp-request.dto';
import { OtpDeliveryService } from './sms.service';

const CONFIG: Record<string, string> = {
  NODE_ENV: 'test',
  INFOBIP_BASE_URL: 'https://example.api.infobip.com',
  INFOBIP_API_KEY: 'secret-key',
  INFOBIP_2FA_APPLICATION_ID: 'application-id',
  INFOBIP_2FA_MESSAGE_ID: 'message-id',
  INFOBIP_SMS_SENDER: '447491163443',
  INFOBIP_WHATSAPP_SENDER: '447860099299',
  INFOBIP_WHATSAPP_TEMPLATE: 'tarhib_login_code',
  INFOBIP_WHATSAPP_LANGUAGE: 'ar',
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

describe('OtpDeliveryService (Infobip)', () => {
  it('sends an SMS PIN and returns the Infobip pinId', async () => {
    const { service, http } = build();
    http.post.mockReturnValue(of({ data: { pinId: 'pin-id' } }));

    await expect(service.send('+33782201206', OtpChannel.SMS)).resolves.toEqual(
      { provider: 'infobip-2fa', pinId: 'pin-id' },
    );

    expect(http.post).toHaveBeenCalledWith(
      'https://example.api.infobip.com/2fa/2/pin',
      {
        applicationId: 'application-id',
        messageId: 'message-id',
        from: '447491163443',
        to: '33782201206',
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'App secret-key',
        }) as unknown,
      }),
    );
  });

  it('verifies an SMS PIN using the stored pinId', async () => {
    const { service, http } = build();
    http.post.mockReturnValue(of({ data: { verified: true } }));

    await expect(
      service.check('+33782201206', '847291', {
        provider: 'infobip-2fa',
        pinId: 'pin-id',
      }),
    ).resolves.toBe(true);

    expect(http.post).toHaveBeenCalledWith(
      'https://example.api.infobip.com/2fa/2/pin/pin-id/verify',
      { pin: '847291' },
      expect.any(Object),
    );
  });

  it('sends a WhatsApp authentication template and verifies its local hash', async () => {
    const { service, http } = build();
    http.post.mockReturnValue(
      of({ data: { messages: [{ status: 'PENDING' }] } }),
    );

    const challenge = await service.send('+33782201206', OtpChannel.WHATSAPP);
    expect(challenge.provider).toBe('local-hash');

    const body = (http.post.mock.calls as unknown[][])[0]?.[1] as {
      messages: Array<{
        content: {
          templateData: { body: { placeholders: string[] } };
        };
      }>;
    };
    const code = body.messages[0]?.content.templateData.body.placeholders[0];
    expect(code).toMatch(/^\d{6}$/);
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
