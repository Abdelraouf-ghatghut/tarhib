import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { MeetingPreparationsController } from './meeting-preparations.controller.js';
import type { MeetingPreparationsService } from './meeting-preparations.service.js';

describe('MeetingPreparationsController', () => {
  const tasks = [
    {
      id: 'owned',
      assignedEmployeeId: 'employee-1',
      participantEmployeeIds: [],
    },
    {
      id: 'participating',
      assignedEmployeeId: 'employee-2',
      participantEmployeeIds: ['employee-1'],
    },
    {
      id: 'foreign',
      assignedEmployeeId: 'employee-2',
      participantEmployeeIds: ['employee-3'],
    },
  ];
  const service = {
    list: jest.fn().mockResolvedValue(tasks),
  } as unknown as MeetingPreparationsService;
  const controller = new MeetingPreparationsController(service);

  const user = (permissions: string[]): JwtPayload => ({
    sub: 'keycloak-1',
    employeeId: 'employee-1',
    email: 'employee@example.com',
    role: 'operations',
    permissions,
    companyId: 'company-1',
    branchId: 'branch-1',
  });

  beforeEach(() => jest.clearAllMocks());

  it('returns only owned or participating preparations to an executor', async () => {
    const result = await controller.list(
      user(['meeting.preparation.execute']),
      undefined,
      undefined,
    );

    expect(result.map((task) => task.id)).toEqual(['owned', 'participating']);
  });

  it('returns the scoped preparation list to a manager', async () => {
    const result = await controller.list(
      user(['meeting.preparation.manage']),
      undefined,
      undefined,
    );

    expect(result).toEqual(tasks);
  });
});
