import { ForbiddenException } from '@nestjs/common';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface.js';
import {
  assertResourceScope,
  constrainRequestedScope,
} from './request-scope.js';

const user = (overrides: Partial<JwtPayload> = {}): JwtPayload => ({
  sub: 'user-1',
  email: 'agent@tarhib.local',
  role: 'COOK',
  permissions: [],
  companyId: 'company-1',
  branchId: 'branch-1',
  dataScope: 'BRANCH',
  ...overrides,
});

describe('constrainRequestedScope', () => {
  it('forces the authenticated branch when no filter is provided', () => {
    expect(constrainRequestedScope(user(), {})).toEqual({
      companyId: 'company-1',
      branchId: 'branch-1',
    });
  });

  it('rejects a branch outside the authenticated scope', () => {
    expect(() =>
      constrainRequestedScope(user(), { branchId: 'branch-2' }),
    ).toThrow(ForbiddenException);
  });

  it('keeps company scope while allowing a branch filter', () => {
    expect(
      constrainRequestedScope(user({ dataScope: 'COMPANY' }), {
        branchId: 'branch-2',
      }),
    ).toEqual({ companyId: 'company-1', branchId: 'branch-2' });
  });

  it('does not constrain global users', () => {
    expect(
      constrainRequestedScope(user({ dataScope: 'GLOBAL' }), {
        companyId: 'company-2',
        branchId: 'branch-9',
      }),
    ).toEqual({ companyId: 'company-2', branchId: 'branch-9' });
  });
});

describe('assertResourceScope', () => {
  it('allows a resource from the authenticated branch', () => {
    expect(() =>
      assertResourceScope(user(), {
        companyId: 'company-1',
        branchId: 'branch-1',
      }),
    ).not.toThrow();
  });

  it('rejects a resource loaded by id from another branch', () => {
    expect(() =>
      assertResourceScope(user(), {
        companyId: 'company-1',
        branchId: 'branch-2',
      }),
    ).toThrow(ForbiddenException);
  });
});
