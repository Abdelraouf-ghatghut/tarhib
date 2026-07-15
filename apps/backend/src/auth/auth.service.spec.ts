/* eslint-disable @typescript-eslint/unbound-method */
import { HttpException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { KeycloakService } from './keycloak/keycloak.service';
import { EmailService } from './email/email.service';
import { RedisService } from '../redis/redis.service';
import { Employee } from '../employees/entities/employee.entity';
import { Company } from '../companies/entities/company.entity';
import { Role } from '../roles/entities/role.entity';
import { EmployeeRole } from '../employees/dto/employee.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import type { TokenResponseDto } from './dto/token-response.dto';
import { AccessPolicyService } from '../access/access-policy.service';

const TOKEN: TokenResponseDto = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresIn: 900,
};

const makeRedis = (overrides: Partial<RedisService> = {}): RedisService =>
  ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(undefined),
    ttl: jest.fn().mockResolvedValue(600),
    ...overrides,
  }) as unknown as RedisService;

const makeKeycloak = (
  overrides: Partial<KeycloakService> = {},
): KeycloakService =>
  ({
    loginWithPassword: jest.fn().mockResolvedValue(TOKEN),
    refreshToken: jest.fn().mockResolvedValue(TOKEN),
    revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
    resetUserPassword: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as KeycloakService;

const makeEmail = (): EmailService =>
  ({
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  }) as unknown as EmailService;

async function buildService(
  redis: RedisService,
  keycloak: KeycloakService,
  email: EmailService = makeEmail(),
): Promise<AuthService> {
  const repoMock = () => ({
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((v: unknown) => v),
    save: jest.fn((v: unknown) => Promise.resolve(v)),
    remove: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  });
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: KeycloakService, useValue: keycloak },
      { provide: RedisService, useValue: redis },
      { provide: EmailService, useValue: email },
      { provide: getRepositoryToken(Employee), useValue: repoMock() },
      { provide: getRepositoryToken(Company), useValue: repoMock() },
      { provide: getRepositoryToken(Role), useValue: repoMock() },
      {
        provide: AccessPolicyService,
        useValue: {
          resolve: jest.fn().mockResolvedValue({
            employee: {},
            primaryRoleId: null,
            roles: [],
            permissions: [],
            capabilities: {},
            modules: [],
            dataScope: 'OWN',
          }),
        },
      },
      {
        provide: ConfigService,
        useValue: { get: (_key: string, def: unknown) => def },
      },
    ],
  }).compile();
  return module.get<AuthService>(AuthService);
}

describe('AuthService.getCurrentUser', () => {
  it('returns the payload unchanged', async () => {
    const svc = await buildService(makeRedis(), makeKeycloak());
    const payload: JwtPayload = {
      sub: 'u1',
      email: 'u@t.com',
      role: EmployeeRole.EMPLOYEE,
      companyId: 'c1',
      branchId: 'b1',
      permissions: [],
    };
    expect(await svc.getCurrentUser(payload)).toBe(payload);
  });
});

describe('AuthService.login (TARHIB-21)', () => {
  it('returns tokens on valid credentials', async () => {
    const svc = await buildService(makeRedis(), makeKeycloak());
    const result = await svc.login({ email: 'u@t.com', password: 'Pass1234!' });
    expect(result.accessToken).toBe('access-token');
  });

  it('throws 401 on wrong credentials', async () => {
    const keycloak = makeKeycloak({
      loginWithPassword: jest
        .fn()
        .mockRejectedValue(new UnauthorizedException()),
    });
    const svc = await buildService(makeRedis(), keycloak);
    await expect(
      svc.login({ email: 'u@t.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('blocks the account after 5 failed attempts', async () => {
    const keycloak = makeKeycloak({
      loginWithPassword: jest
        .fn()
        .mockRejectedValue(new UnauthorizedException()),
    });
    const redis = makeRedis({ incr: jest.fn().mockResolvedValue(5) });
    const svc = await buildService(redis, keycloak);
    await expect(
      svc.login({ email: 'u@t.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('rejects immediately when account is already blocked', async () => {
    const redis = makeRedis({ get: jest.fn().mockResolvedValue('1') });
    const svc = await buildService(redis, makeKeycloak());
    await expect(
      svc.login({ email: 'u@t.com', password: 'any' }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('error message does not distinguish email vs password (TARHIB-21 AC)', async () => {
    const keycloak = makeKeycloak({
      loginWithPassword: jest
        .fn()
        .mockRejectedValue(new UnauthorizedException()),
    });
    const svc = await buildService(makeRedis(), keycloak);
    try {
      await svc.login({ email: 'u@t.com', password: 'wrong' });
    } catch (err) {
      const msg = (err as UnauthorizedException).message.toLowerCase();
      expect(msg).not.toContain('email');
      expect(msg).not.toContain('mot de passe');
      expect(msg).not.toContain('password');
    }
  });
});

describe('AuthService.requestPasswordReset (TARHIB-23)', () => {
  it('stores a reset token in Redis and sends email', async () => {
    const redis = makeRedis();
    const email = makeEmail();
    const svc = await buildService(redis, makeKeycloak(), email);
    await svc.requestPasswordReset({ email: 'u@t.com' });
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('pwd_reset:'),
      'u@t.com',
      3600,
    );
    expect(email.sendPasswordResetEmail).toHaveBeenCalledWith(
      'u@t.com',
      expect.any(String),
    );
  });

  it('always resolves even if email does not exist (no user enumeration)', async () => {
    const email = makeEmail();
    const svc = await buildService(makeRedis(), makeKeycloak(), email);
    await expect(
      svc.requestPasswordReset({ email: 'unknown@t.com' }),
    ).resolves.toBeUndefined();
  });
});

describe('AuthService.resetPassword (TARHIB-23)', () => {
  it('resets password and deletes the token', async () => {
    const redis = makeRedis({
      get: jest.fn().mockResolvedValue('u@t.com'),
    });
    const keycloak = makeKeycloak();
    const svc = await buildService(redis, keycloak);
    await svc.resetPassword({ token: 'valid-token', newPassword: 'NewP@ss1!' });
    expect(redis.del).toHaveBeenCalledWith('pwd_reset:valid-token');
    expect(keycloak.resetUserPassword).toHaveBeenCalledWith(
      'u@t.com',
      'NewP@ss1!',
    );
  });

  it('throws 401 when token is invalid or expired', async () => {
    const redis = makeRedis({ get: jest.fn().mockResolvedValue(null) });
    const svc = await buildService(redis, makeKeycloak());
    await expect(
      svc.resetPassword({ token: 'expired', newPassword: 'NewP@ss1!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('deletes token BEFORE calling Keycloak (prevents token replay)', async () => {
    const callOrder: string[] = [];
    const redis = makeRedis({
      get: jest.fn().mockResolvedValue('u@t.com'),
      del: jest.fn().mockImplementation(() => {
        callOrder.push('del');
        return Promise.resolve();
      }),
    });
    const keycloak = makeKeycloak({
      resetUserPassword: jest.fn().mockImplementation(() => {
        callOrder.push('reset');
        return Promise.resolve();
      }),
    });
    const svc = await buildService(redis, keycloak);
    await svc.resetPassword({ token: 'tok', newPassword: 'NewP@ss1!' });
    expect(callOrder).toEqual(['del', 'reset']);
  });
});

describe('AuthService.refresh / logout (TARHIB-24)', () => {
  it('delegates refresh to KeycloakService', async () => {
    const keycloak = makeKeycloak();
    const svc = await buildService(makeRedis(), keycloak);
    const result = await svc.refresh({ refreshToken: 'rt' });
    expect(keycloak.refreshToken).toHaveBeenCalledWith('rt');
    expect(result.accessToken).toBe('access-token');
  });

  it('delegates logout (revokeRefreshToken) to KeycloakService', async () => {
    const keycloak = makeKeycloak();
    const svc = await buildService(makeRedis(), keycloak);
    await svc.logout({ refreshToken: 'rt' });
    expect(keycloak.revokeRefreshToken).toHaveBeenCalledWith('rt');
  });
});
