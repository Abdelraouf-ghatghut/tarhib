import { ForbiddenException } from '@nestjs/common';
import { PERMISSION_KEY } from '../auth/decorators/require-permission.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { CleaningTasksController } from '../cleaning-tasks/cleaning-tasks.controller.js';
import { DeliveryController } from '../delivery/delivery.controller.js';
import { MeetingPreparationsController } from '../meeting-preparations/meeting-preparations.controller.js';
import { ProcurementController } from '../procurement/procurement.controller.js';

const permissions = (controller: object, method: string): string[] => {
  const proto = Object.getPrototypeOf(controller) as Record<
    string,
    () => unknown
  >;
  const value = Reflect.getMetadata(PERMISSION_KEY, proto[method]) as
    | string
    | string[];
  return Array.isArray(value) ? value : [value];
};

describe('Operations endpoint permission matrix', () => {
  const deliveryService = { findOne: jest.fn(), transitionAtomic: jest.fn() };
  const delivery = new DeliveryController(deliveryService as never);
  const cleaning = new CleaningTasksController({} as never);
  const meetings = new MeetingPreparationsController({} as never);
  const procurement = new ProcurementController({} as never);

  it.each([
    [delivery, 'accept', ['order.deliver']],
    [delivery, 'issue', ['order.deliver']],
    [delivery, 'resume', ['order.queue.manage']],
    [delivery, 'returnToBranch', ['order.queue.manage']],
    [cleaning, 'assign', ['cleaning.task.assign', 'cleaning.task.manage']],
    [cleaning, 'complete', ['cleaning.task.complete', 'cleaning.task.manage']],
    [meetings, 'assign', ['meeting.preparation.manage']],
    [procurement, 'receive', ['procurement.receive', 'procurement.manage']],
  ])(
    '%s.%s is protected by the exact execution permission',
    (controller, method, expected) => {
      expect(permissions(controller, method)).toEqual(expected);
    },
  );

  it('rejects a manager exception against a task from another branch', async () => {
    deliveryService.findOne.mockResolvedValue({
      id: 'task',
      companyId: 'company-1',
      branchId: 'branch-2',
    });
    const user = {
      sub: 'manager',
      companyId: 'company-1',
      branchId: 'branch-1',
      dataScope: 'BRANCH',
      permissions: ['order.queue.manage'],
    } as JwtPayload;
    await expect(delivery.resume(user, 'task')).rejects.toThrow(
      ForbiddenException,
    );
    expect(deliveryService.transitionAtomic).not.toHaveBeenCalled();
  });
});
