import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtStrategy } from './jwt.strategy.js';
import { Employee } from '../../employees/entities/employee.entity.js';
import { AccessPolicyService } from '../../access/access-policy.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { JwtPayload } from '../interfaces/jwt-payload.interface.js';

describe('JwtStrategy (PR-0.5 — résilience Redis)', () => {
  let strategy: JwtStrategy;
  let employeeRepo: { findOne: jest.Mock };
  let accessPolicy: { resolve: jest.Mock; resolveAsRole: jest.Mock };
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
    redis = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: { get: jest.fn(() => 'x') } },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: AccessPolicyService, useValue: accessPolicy },
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
});
