import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { PasswordChangeRequiredGuard } from './password-change-required.guard.js';

function context(path: string, mustChangePassword?: boolean): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        path,
        user: { sub: 'user-1', mustChangePassword },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('PasswordChangeRequiredGuard', () => {
  const guard = new PasswordChangeRequiredGuard();

  it('blocks business endpoints until the password is changed', () => {
    expect(() => guard.canActivate(context('/operations/tasks', true))).toThrow(
      ForbiddenException,
    );
  });

  it('allows the password change endpoint', () => {
    expect(guard.canActivate(context('/auth/password/change', true))).toBe(
      true,
    );
  });

  it('does not affect normal accounts', () => {
    expect(guard.canActivate(context('/operations/tasks', false))).toBe(true);
  });
});
