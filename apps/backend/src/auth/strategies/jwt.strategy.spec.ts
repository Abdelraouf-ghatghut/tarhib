import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtStrategy } from './jwt.strategy.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { AccessPolicyService } from '../../access/access-policy.service.js';
import { AccessCacheService } from '../../access/access-cache.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';

describe("JwtStrategy (PR-0.5 résilience Redis + PR-1.0 cache d'accès)", () => {
  let strategy: JwtStrategy;
  let employeeRepo: { findOne: jest.Mock };
  let accessPolicy: { resolve: jest.Mock; resolveAsRole: jest.Mock };
  let accessCache: { get: jest.Mock; set: jest.Mock };
  let redis: { get: jest.Mock };

  const employee: Partial<Employee> = {
    id: 'emp-uuid-1',
    companyId: 'co-1',
    branchId: 'br-1',
    email: 'e@co.com',
    role: 'EMPLOYEE',
  };

  const accessProfile = {
    roles: [
      {
        id: 'role-1',
        nameAr: 'موظف',
        nameEn: 'Employee',
        scope: 'CLIENT',
        primary: true,
      },
    ],
    permissions: ['catalog.view', 'order.create'],
    capabilities: {},
    modules: [],
    dataScope: 'OWN',
    employee: { companyId: 'co-1' },
  };

  beforeEach(async () => {
    employeeRepo = { findOne: jest.fn().mockResolvedValue(employee) };
    accessPolicy = {
      resolve: jest.fn().mockResolvedValue(accessProfile),
      resolveAsRole: jest.fn(),
    };
    // Cache miss par défaut : les tests existants exercent le chemin DB complet
    // inchangé, sauf ceux qui positionnent get.mockResolvedValue(...) eux-mêmes.
    accessCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    redis = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: { get: jest.fn(() => 'x') } },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: AccessPolicyService, useValue: accessPolicy },
        { provide: AccessCacheService, useValue: accessCache },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
  });

  const payload: JwtPayload = {
    sub: 'keycloak-1',
    email: 'e@co.com',
    role: '',
    companyId: '',
    permissions: [],
  };

  it('resolves normally when Redis responds (no impersonation active)', async () => {
    redis.get.mockResolvedValue(null);
    const result = await strategy.validate(payload);
    expect(result.permissions).toEqual(['catalog.view', 'order.create']);
    expect(accessPolicy.resolveAsRole).not.toHaveBeenCalled();
  });

  it('applies impersonation when Redis holds an override role', async () => {
    redis.get.mockResolvedValue('role-override-id');
    accessPolicy.resolveAsRole.mockResolvedValue({
      ...accessProfile,
      permissions: ['operations.dashboard.view'],
    });
    const result = await strategy.validate(payload);
    expect(accessPolicy.resolveAsRole).toHaveBeenCalledWith(
      employee,
      'role-override-id',
    );
    expect(result.permissions).toEqual(['operations.dashboard.view']);
  });

  // La garantie centrale de PR-0.5 : une panne Redis ne doit JAMAIS empêcher
  // un employé déjà authentifié par un JWT valide d'accéder à l'API — elle ne
  // fait que désactiver l'impersonation pour cette requête.
  it('does not throw and authenticates normally when Redis is unavailable', async () => {
    redis.get.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await strategy.validate(payload);

    expect(result.permissions).toEqual(['catalog.view', 'order.create']);
    expect(result.companyId).toBe('co-1');
    expect(accessPolicy.resolveAsRole).not.toHaveBeenCalled();
  });

  it('does not throw when Redis times out', async () => {
    redis.get.mockRejectedValue(new Error('Command timed out'));
    await expect(strategy.validate(payload)).resolves.toBeDefined();
  });

  describe("PR-1.0 — cache du profil d'accès", () => {
    const cachedProfile = {
      employeeId: 'emp-uuid-1',
      email: 'e@co.com',
      companyId: 'co-1',
      branchId: 'br-1',
      role: 'Employee',
      permissions: ['catalog.view'],
      capabilities: {},
      modules: [],
      dataScope: 'OWN' as const,
    };

    it('returns the cached profile without querying the DB when not impersonating', async () => {
      accessCache.get.mockResolvedValue(cachedProfile);
      redis.get.mockResolvedValue(null); // pas d'impersonation

      const result = await strategy.validate(payload);

      expect(result.permissions).toEqual(['catalog.view']);
      expect(result.employeeId).toBe('emp-uuid-1');
      expect(employeeRepo.findOne).not.toHaveBeenCalled();
      expect(accessPolicy.resolve).not.toHaveBeenCalled();
    });

    // Garantie centrale : un cache figé ne doit JAMAIS masquer une
    // impersonation qu'un admin vient d'activer.
    it('falls through to the full DB path when impersonation is active despite a cache hit', async () => {
      accessCache.get.mockResolvedValue(cachedProfile);
      redis.get.mockResolvedValue('role-override-id');
      accessPolicy.resolveAsRole.mockResolvedValue({
        ...accessProfile,
        permissions: ['operations.dashboard.view'],
      });

      const result = await strategy.validate(payload);

      expect(redis.get).toHaveBeenCalledWith(
        expect.stringContaining('emp-uuid-1'),
      );
      expect(accessPolicy.resolveAsRole).toHaveBeenCalled();
      expect(result.permissions).toEqual(['operations.dashboard.view']);
    });

    it('populates the cache after a normal (non-impersonated) resolution', async () => {
      accessCache.get.mockResolvedValue(null);
      redis.get.mockResolvedValue(null);

      await strategy.validate(payload);

      expect(accessCache.set).toHaveBeenCalledWith(
        'keycloak-1',
        expect.objectContaining({
          employeeId: 'emp-uuid-1',
          permissions: ['catalog.view', 'order.create'],
        }),
      );
    });

    it('never caches an impersonated resolution', async () => {
      accessCache.get.mockResolvedValue(null);
      redis.get.mockResolvedValue('role-override-id');
      accessPolicy.resolveAsRole.mockResolvedValue({
        ...accessProfile,
        permissions: ['operations.dashboard.view'],
      });

      await strategy.validate(payload);

      expect(accessCache.set).not.toHaveBeenCalled();
    });
  });
});
