import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { EmployeeRole } from '../../employees/dto/employee.dto';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('RolesGuard (TARHIB-25)', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const buildCtx = (
    role: EmployeeRole | undefined,
    requiredRoles: EmployeeRole[] | undefined,
  ): ExecutionContext => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

    const user: Partial<JwtPayload> = role
      ? { sub: 'u1', email: 'u@t.com', role, companyId: 'c1', branchId: 'b1' }
      : {};

    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('allows access when no @Roles() decorator is present', () => {
    const ctx = buildCtx(EmployeeRole.EMPLOYEE, undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when required roles array is empty', () => {
    const ctx = buildCtx(EmployeeRole.EMPLOYEE, []);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows ADMIN to access ADMIN-only route', () => {
    const ctx = buildCtx(EmployeeRole.ADMIN, [EmployeeRole.ADMIN]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies EMPLOYEE access to ADMIN-only route (HTTP 403)', () => {
    const ctx = buildCtx(EmployeeRole.EMPLOYEE, [EmployeeRole.ADMIN]);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('denies HOSPITALITY_AGENT access to ADMIN-only route', () => {
    const ctx = buildCtx(EmployeeRole.HOSPITALITY_AGENT, [EmployeeRole.ADMIN]);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('allows DEPARTMENT_MANAGER to access MANAGER-or-ADMIN route', () => {
    const ctx = buildCtx(EmployeeRole.DEPARTMENT_MANAGER, [
      EmployeeRole.DEPARTMENT_MANAGER,
      EmployeeRole.ADMIN,
    ]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows ADMIN to access MANAGER-or-ADMIN route', () => {
    const ctx = buildCtx(EmployeeRole.ADMIN, [
      EmployeeRole.DEPARTMENT_MANAGER,
      EmployeeRole.ADMIN,
    ]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies EMPLOYEE access to MANAGER-or-ADMIN route', () => {
    const ctx = buildCtx(EmployeeRole.EMPLOYEE, [
      EmployeeRole.DEPARTMENT_MANAGER,
      EmployeeRole.ADMIN,
    ]);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('allows INVENTORY_MANAGER to access INVENTORY_MANAGER route', () => {
    const ctx = buildCtx(EmployeeRole.INVENTORY_MANAGER, [
      EmployeeRole.INVENTORY_MANAGER,
    ]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies EMPLOYEE access to INVENTORY_MANAGER route', () => {
    const ctx = buildCtx(EmployeeRole.EMPLOYEE, [
      EmployeeRole.INVENTORY_MANAGER,
    ]);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('denies access when user is undefined (no JWT)', () => {
    const ctx = buildCtx(undefined, [EmployeeRole.ADMIN]);
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
