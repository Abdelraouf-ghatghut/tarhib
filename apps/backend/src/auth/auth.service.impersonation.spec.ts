import { ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { EmployeeScope } from '../employees/entities/employee.entity.js';
import { IMPERSONATE_ROLE_KEY_PREFIX } from './impersonation.constants.js';
import type { JwtPayload } from './interfaces/jwt-payload.interface.js';

const actor: JwtPayload = {
  sub: 'kc-actor',
  employeeId: 'emp-actor',
  email: 'actor@tarhib.local',
  role: 'Directeur',
  permissions: [],
  companyId: '',
};

describe('AuthService — impersonation guards anti-escalade (§3 sécurité)', () => {
  let keycloak: { impersonate: jest.Mock; revokeRefreshToken: jest.Mock };
  let redis: { set: jest.Mock; del: jest.Mock; get: jest.Mock };
  let employeeRepo: { findOne: jest.Mock };
  let accessPolicy: { resolveAsRole: jest.Mock };
  let auditService: { log: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    keycloak = {
      impersonate: jest.fn(),
      revokeRefreshToken: jest.fn(),
    };
    redis = { set: jest.fn(), del: jest.fn(), get: jest.fn() };
    employeeRepo = { findOne: jest.fn() };
    accessPolicy = { resolveAsRole: jest.fn() };
    auditService = { log: jest.fn() };

    service = new AuthService(
      keycloak as never,
      redis as never,
      {} as never, // email
      { get: jest.fn() } as never, // config
      employeeRepo as never, // employeeRepo
      {} as never, // companyRepo
      {} as never, // branchRepo
      {} as never, // departmentRepo
      {} as never, // roleRepo
      accessPolicy as never,
      auditService as never,
    );
  });

  describe('startEmployeeImpersonation', () => {
    const target = {
      id: 'emp-target',
      email: 'target@tarhib.local',
      active: true,
      keycloakId: 'kc-target',
    };

    it('rejects impersonating oneself', async () => {
      await expect(
        service.startEmployeeImpersonation(actor, 'emp-actor'),
      ).rejects.toThrow();
      expect(keycloak.impersonate).not.toHaveBeenCalled();
    });

    it('rejects a CLIENT-scope target — the web admin is internal-only', async () => {
      employeeRepo.findOne.mockResolvedValue({
        ...target,
        scope: EmployeeScope.CLIENT,
      });

      await expect(
        service.startEmployeeImpersonation(actor, 'emp-target'),
      ).rejects.toThrow(ForbiddenException);
      expect(keycloak.impersonate).not.toHaveBeenCalled();
    });

    it('revokes the freshly-exchanged token and rejects a target with company.manage', async () => {
      employeeRepo.findOne.mockResolvedValue(target);
      keycloak.impersonate.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        expiresIn: 900,
      });
      jest.spyOn(service as any, 'enrichTokens').mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        expiresIn: 900,
        permissions: ['company.manage'],
      });

      await expect(
        service.startEmployeeImpersonation(actor, 'emp-target'),
      ).rejects.toThrow(ForbiddenException);
      expect(keycloak.revokeRefreshToken).toHaveBeenCalledWith('r');
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('logs an audit entry and returns enriched tokens on success', async () => {
      employeeRepo.findOne.mockResolvedValue(target);
      keycloak.impersonate.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        expiresIn: 900,
      });
      jest.spyOn(service as any, 'enrichTokens').mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        expiresIn: 900,
        permissions: ['order.queue.view'],
      });

      const result = await service.startEmployeeImpersonation(
        actor,
        'emp-target',
      );

      expect(result.accessToken).toBe('a');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IMPERSONATE_EMPLOYEE_START',
          entityId: 'emp-target',
        }),
      );
    });
  });

  describe('startRoleImpersonation', () => {
    it('never activates the Redis override for a role carrying company.manage', async () => {
      employeeRepo.findOne.mockResolvedValue({
        id: 'emp-actor',
        scope: EmployeeScope.TARHIB,
      });
      accessPolicy.resolveAsRole.mockResolvedValue({
        permissions: ['company.manage'],
      });

      await expect(
        service.startRoleImpersonation(actor, 'role-superadmin'),
      ).rejects.toThrow(ForbiddenException);
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('sets the Redis override with the security TTL for an ordinary role', async () => {
      employeeRepo.findOne.mockResolvedValue({
        id: 'emp-actor',
        scope: EmployeeScope.TARHIB,
      });
      accessPolicy.resolveAsRole.mockResolvedValue({
        permissions: ['order.queue.view'],
      });

      const result = await service.startRoleImpersonation(actor, 'role-cook');

      expect(redis.set).toHaveBeenCalledWith(
        `${IMPERSONATE_ROLE_KEY_PREFIX}emp-actor`,
        'role-cook',
        expect.any(Number),
      );
      expect(result.permissions).toEqual(['order.queue.view']);
    });
  });
});
