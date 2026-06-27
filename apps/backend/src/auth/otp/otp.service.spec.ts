/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { RedisService } from '../../redis/redis.service';
import { SmsService } from '../sms/sms.service';
import { KeycloakService } from '../keycloak/keycloak.service';
import type { TokenResponseDto } from '../dto/token-response.dto';

const TOKEN: TokenResponseDto = {
  accessToken: 'at',
  refreshToken: 'rt',
  expiresIn: 900,
};

const makeRedis = (overrides: Partial<RedisService> = {}): RedisService =>
  ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as RedisService;

const makeSms = (): SmsService =>
  ({ send: jest.fn().mockResolvedValue(undefined) }) as unknown as SmsService;

const makeKeycloak = (): KeycloakService =>
  ({
    loginWithPhoneOtp: jest.fn().mockResolvedValue(TOKEN),
  }) as unknown as KeycloakService;

async function build(
  redis: RedisService,
): Promise<{ svc: OtpService; sms: SmsService; keycloak: KeycloakService }> {
  const sms = makeSms();
  const keycloak = makeKeycloak();
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      OtpService,
      { provide: RedisService, useValue: redis },
      { provide: SmsService, useValue: sms },
      { provide: KeycloakService, useValue: keycloak },
    ],
  }).compile();
  return { svc: module.get<OtpService>(OtpService), sms, keycloak };
}

describe('OtpService.requestOtp (TARHIB-22)', () => {
  it('stores a 6-digit OTP in Redis with 300s TTL', async () => {
    const redis = makeRedis();
    const { svc } = await build(redis);
    await svc.requestOtp('+213555000000');
    expect(redis.set).toHaveBeenCalledWith(
      'otp:+213555000000',
      expect.stringMatching(/"code":"\d{6}"/),
      300,
    );
  });

  it('sends an SMS via SmsService', async () => {
    const redis = makeRedis();
    const { svc, sms } = await build(redis);
    await svc.requestOtp('+213555000000');
    expect(sms.send).toHaveBeenCalledWith(
      '+213555000000',
      expect.stringContaining('Tarhib'),
    );
  });

  it('overwrites existing OTP for the same number (one active at a time)', async () => {
    const redis = makeRedis();
    const { svc } = await build(redis);
    await svc.requestOtp('+213555000000');
    await svc.requestOtp('+213555000000');
    expect(redis.set).toHaveBeenCalledTimes(2);
  });
});

describe('OtpService.verifyOtp (TARHIB-22)', () => {
  const validRecord = JSON.stringify({ code: '847291', attempts: 0 });

  it('returns tokens on correct code', async () => {
    const redis = makeRedis({ get: jest.fn().mockResolvedValue(validRecord) });
    const { svc, keycloak } = await build(redis);
    const result = await svc.verifyOtp('+213555000000', '847291');
    expect(result.accessToken).toBe('at');
    expect(keycloak.loginWithPhoneOtp).toHaveBeenCalledWith('+213555000000');
  });

  it('deletes the OTP record after successful verification', async () => {
    const redis = makeRedis({ get: jest.fn().mockResolvedValue(validRecord) });
    const { svc } = await build(redis);
    await svc.verifyOtp('+213555000000', '847291');
    expect(redis.del).toHaveBeenCalledWith('otp:+213555000000');
  });

  it('throws 401 when OTP is not found (expired or never requested)', async () => {
    const redis = makeRedis({ get: jest.fn().mockResolvedValue(null) });
    const { svc } = await build(redis);
    await expect(
      svc.verifyOtp('+213555000000', '000000'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws 401 on wrong code', async () => {
    const redis = makeRedis({ get: jest.fn().mockResolvedValue(validRecord) });
    const { svc } = await build(redis);
    await expect(
      svc.verifyOtp('+213555000000', '000000'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('invalidates OTP after 3 wrong attempts', async () => {
    const record = JSON.stringify({ code: '847291', attempts: 3 });
    const redis = makeRedis({ get: jest.fn().mockResolvedValue(record) });
    const { svc } = await build(redis);
    await expect(
      svc.verifyOtp('+213555000000', 'wrong'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(redis.del).toHaveBeenCalledWith('otp:+213555000000');
  });
});
