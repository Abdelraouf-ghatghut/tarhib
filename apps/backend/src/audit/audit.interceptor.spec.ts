import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor.js';

describe('AuditInterceptor', () => {
  it('audits successful mutations and recursively redacts secrets', (done) => {
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new AuditInterceptor(audit as never);
    const request = {
      method: 'PATCH',
      url: '/delivery/tasks/task-1/issue',
      params: { id: 'task-1' },
      ip: '127.0.0.1',
      user: { sub: 'user-1' },
      body: { reason: 'absent', nested: { refreshToken: 'secret' } },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    interceptor
      .intercept(context, { handle: () => of({ ok: true }) } as CallHandler)
      .subscribe({
        complete: () =>
          setImmediate(() => {
            expect(audit.log).toHaveBeenCalledWith(
              expect.objectContaining({
                entity: 'delivery',
                entityId: 'task-1',
                metadata: expect.objectContaining({
                  body: {
                    reason: 'absent',
                    nested: { refreshToken: '[REDACTED]' },
                  },
                }) as unknown,
              }),
            );
            done();
          }),
      });
  });
});
