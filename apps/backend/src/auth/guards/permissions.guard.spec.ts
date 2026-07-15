import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard.js';

const contextWith = (permissions: string[]): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: { permissions } }),
    }),
  }) as unknown as ExecutionContext;

describe('PermissionsGuard', () => {
  it('allows a route without permission metadata', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    expect(new PermissionsGuard(reflector).canActivate(contextWith([]))).toBe(
      true,
    );
  });

  it('keeps supporting a single required permission', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('stock.manage'),
    } as unknown as Reflector;

    expect(
      new PermissionsGuard(reflector).canActivate(
        contextWith(['stock.manage']),
      ),
    ).toBe(true);
  });

  it('accepts any permission from migration metadata', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue(['stock.manage', 'inventory.manage']),
    } as unknown as Reflector;

    expect(
      new PermissionsGuard(reflector).canActivate(
        contextWith(['inventory.manage']),
      ),
    ).toBe(true);
  });

  it('rejects when none of the accepted permissions is present', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue(['stock.manage', 'inventory.manage']),
    } as unknown as Reflector;

    expect(() =>
      new PermissionsGuard(reflector).canActivate(contextWith(['stock.view'])),
    ).toThrow(ForbiddenException);
  });
});
