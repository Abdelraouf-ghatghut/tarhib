/* eslint-disable @typescript-eslint/unbound-method */
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import type { Repository } from 'typeorm';
import {
  Employee,
  EmployeeScope,
  EmployeeStatus,
} from '../../employees/entities/employee.entity';
import { RedisService } from '../../redis/redis.service';
import type { TokenResponseDto } from '../dto/token-response.dto';
import { OtpAppMode, OtpChannel } from '../dto/otp-request.dto';
import { KeycloakService } from '../keycloak/keycloak.service';
import { OtpDeliveryService } from '../sms/sms.service';
import { OtpService } from './otp.service';

const TOKEN: TokenResponseDto = {
  accessToken: 'at',
  refreshToken: 'rt',
  expiresIn: 900,
};

const EMPLOYEE = {
  id: 'employee-id',
  keycloakId: 'keycloak-id',
  phoneNumber: '+218912345678',
  active: true,
  status: EmployeeStatus.ACTIVE,
  scope: EmployeeScope.CLIENT,
} as Employee;

const makeRedis = (overrides: Partial<RedisService> = {}): RedisService =>
  ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(undefined),
    ttl: jest.fn().mockResolvedValue(240),
    ...overrides,
  }) as unknown as RedisService;

async function build({
  redis = makeRedis(),
  employee = EMPLOYEE,
  approved = true,
}: {
  redis?: RedisService;
  employee?: Employee | null;
  approved?: boolean;
} = {}) {
  const delivery = {
    send: jest.fn().mockResolvedValue({
      provider: 'infobip-2fa',
      pinId: 'infobip-pin-id',
    }),
    check: jest.fn().mockResolvedValue(approved),
  };
  const keycloak = {
    loginWithPhoneOtp: jest.fn().mockResolvedValue(TOKEN),
  };
  const employeeRepo = {
    findOne: jest.fn().mockResolvedValue(employee),
  };
  const config = {
    get: jest.fn((_key: string, fallback: string) => fallback),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      OtpService,
      { provide: RedisService, useValue: redis },
      { provide: OtpDeliveryService, useValue: delivery },
      { provide: KeycloakService, useValue: keycloak },
      { provide: ConfigService, useValue: config },
      { provide: getRepositoryToken(Employee), useValue: employeeRepo },
    ],
  }).compile();

  return {
    service: module.get(OtpService),
    delivery,
    keycloak,
    employeeRepo: employeeRepo as Pick<Repository<Employee>, 'findOne'>,
  };
}

describe('OtpService', () => {
  it('starts an SMS verification for an eligible employee', async () => {
    const redis = makeRedis();
    const { service, delivery } = await build({ redis });

    await service.requestOtp(
      EMPLOYEE.phoneNumber,
      OtpChannel.SMS,
      OtpAppMode.EMPLOYEE,
    );

    expect(delivery.send).toHaveBeenCalledWith(
      EMPLOYEE.phoneNumber,
      OtpChannel.SMS,
    );
    expect(redis.set).toHaveBeenCalledWith(
      `otp:session:${EMPLOYEE.phoneNumber}`,
      expect.stringContaining('infobip-pin-id'),
      300,
    );
  });

  it('does not send or reveal an unknown phone number', async () => {
    const { service, delivery } = await build({ employee: null });
    await service.requestOtp(
      '+218900000000',
      OtpChannel.WHATSAPP,
      OtpAppMode.EMPLOYEE,
    );
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('does not send when the application scope is wrong', async () => {
    const { service, delivery } = await build();
    await service.requestOtp(
      EMPLOYEE.phoneNumber,
      OtpChannel.SMS,
      OtpAppMode.OPERATIONS,
    );
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('returns Keycloak tokens after Infobip approves the code', async () => {
    const session = JSON.stringify({
      employeeId: EMPLOYEE.id,
      keycloakId: EMPLOYEE.keycloakId,
      appMode: OtpAppMode.EMPLOYEE,
      attempts: 0,
      challenge: { provider: 'infobip-2fa', pinId: 'infobip-pin-id' },
    });
    const redis = makeRedis({ get: jest.fn().mockResolvedValue(session) });
    const { service, delivery, keycloak } = await build({ redis });

    const result = await service.verifyOtp(
      EMPLOYEE.phoneNumber,
      '847291',
      OtpAppMode.EMPLOYEE,
    );

    expect(result).toEqual(TOKEN);
    expect(delivery.check).toHaveBeenCalledWith(
      EMPLOYEE.phoneNumber,
      '847291',
      { provider: 'infobip-2fa', pinId: 'infobip-pin-id' },
    );
    expect(keycloak.loginWithPhoneOtp).toHaveBeenCalledWith('keycloak-id');
    expect(redis.del).toHaveBeenCalledWith(
      `otp:session:${EMPLOYEE.phoneNumber}`,
    );
  });

  it('keeps the original remaining TTL after an invalid code', async () => {
    const session = JSON.stringify({
      employeeId: EMPLOYEE.id,
      keycloakId: EMPLOYEE.keycloakId,
      appMode: OtpAppMode.EMPLOYEE,
      attempts: 0,
      challenge: { provider: 'infobip-2fa', pinId: 'infobip-pin-id' },
    });
    const redis = makeRedis({ get: jest.fn().mockResolvedValue(session) });
    const { service } = await build({ redis, approved: false });

    await expect(
      service.verifyOtp(EMPLOYEE.phoneNumber, '000001', OtpAppMode.EMPLOYEE),
    ).rejects.toThrow('invalidOtpCode');
    expect(redis.set).toHaveBeenCalledWith(
      `otp:session:${EMPLOYEE.phoneNumber}`,
      expect.stringContaining('"attempts":1'),
      240,
    );
  });

  it('deletes the session on the third invalid attempt', async () => {
    const session = JSON.stringify({
      employeeId: EMPLOYEE.id,
      keycloakId: EMPLOYEE.keycloakId,
      appMode: OtpAppMode.EMPLOYEE,
      attempts: 2,
      challenge: { provider: 'infobip-2fa', pinId: 'infobip-pin-id' },
    });
    const redis = makeRedis({ get: jest.fn().mockResolvedValue(session) });
    const { service } = await build({ redis, approved: false });

    await expect(
      service.verifyOtp(EMPLOYEE.phoneNumber, '000001', OtpAppMode.EMPLOYEE),
    ).rejects.toThrow('tooManyOtpAttempts');
    expect(redis.del).toHaveBeenCalledWith(
      `otp:session:${EMPLOYEE.phoneNumber}`,
    );
  });
});
