import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  Employee,
  EmployeeScope,
} from '../employees/entities/employee.entity.js';
import { Permission } from '../roles/entities/permission.entity.js';
import { Role, RoleScope } from '../roles/entities/role.entity.js';
import { AccessPolicyService } from './access-policy.service.js';

const role = (id: string, permissions: string[]): Role =>
  ({
    id,
    nameAr: id,
    nameEn: id,
    scope: RoleScope.TARHIB,
    permissions: permissions.map((key) => ({ key }) as Permission),
  }) as Role;
const employee = (roleId: string): Employee =>
  ({
    id: 'emp-1',
    keycloakId: 'kc-1',
    email: 'agent@tarhib.local',
    firstNameAr: 'Agent',
    firstNameEn: 'Agent',
    lastNameAr: 'Tarhib',
    lastNameEn: 'Tarhib',
    phoneNumber: '+000',
    companyId: 'co-1',
    branchId: 'br-1',
    departmentId: null,
    scope: EmployeeScope.TARHIB,
    roleId,
    role: roleId,
    additionalRoles: [],
    company: null,
    branch: null,
  }) as Employee;

describe('AccessPolicyService — Operations role matrix', () => {
  const roleRepo = { find: jest.fn(), findOne: jest.fn() };
  let service: AccessPolicyService;
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AccessPolicyService,
        { provide: getRepositoryToken(Role), useValue: roleRepo },
      ],
    }).compile();
    service = module.get(AccessPolicyService);
  });
  const resolve = async (r: Role) => {
    roleRepo.find.mockResolvedValue([r]);
    return service.resolve(employee(r.id));
  };

  it('gives the cook kitchen execution without delivery or stock mutation', async () => {
    const access = await resolve(
      role('cook', [
        'order.queue.view',
        'order.prepare',
        'order.stockout.report',
        'stock.kitchen.view',
        'stock.kitchen.request',
      ]),
    );
    expect(access.capabilities.canPrepareOrders).toBe(true);
    expect(access.capabilities.canDeliverOrders).toBe(false);
    expect(access.capabilities.canManageStock).toBe(false);
    expect(access.modules.map((m) => m.key)).toEqual(
      expect.arrayContaining([
        'operations.kitchen',
        'operations.kitchen_stock',
      ]),
    );
  });

  it('gives the delivery agent delivery only', async () => {
    const access = await resolve(
      role('delivery', ['order.queue.view', 'order.deliver']),
    );
    expect(access.capabilities.canDeliverOrders).toBe(true);
    expect(access.capabilities.canPrepareOrders).toBe(false);
    expect(access.modules.map((m) => m.key)).toContain('operations.delivery');
  });

  it('gives the cleaner assigned cleaning work without inventory', async () => {
    const access = await resolve(
      role('cleaner', ['cleaning.task.view', 'cleaning.task.complete']),
    );
    expect(access.capabilities.canViewCleaningTasks).toBe(true);
    expect(access.capabilities.canCompleteCleaningTasks).toBe(true);
    expect(access.capabilities.canViewStock).toBe(false);
  });

  it('gives the stock manager transfers and VIP while excluding order execution', async () => {
    const access = await resolve(
      role('stock', [
        'stock.view',
        'stock.manage',
        'stock.transfer',
        'vip.view',
        'vip.manage',
        'procurement.view',
      ]),
    );
    expect(access.capabilities.canManageStock).toBe(true);
    expect(access.capabilities.canTransferStock).toBe(true);
    expect(access.capabilities.canManageVip).toBe(true);
    expect(access.capabilities.canPrepareOrders).toBe(false);
    expect(access.capabilities.canDeliverOrders).toBe(false);
  });

  it('gives hospitality meeting preparation without client room booking', async () => {
    const access = await resolve(
      role('hospitality', [
        'meeting.preparation.view',
        'meeting.preparation.execute',
        'stock.kitchen.view',
      ]),
    );
    expect(access.capabilities.canViewMeetingPreparations).toBe(true);
    expect(access.capabilities.canBookMeeting).toBe(false);
    expect(access.modules.map((m) => m.key)).toContain('operations.meetings');
  });

  it('unions additional roles without inferring permissions from role names', async () => {
    const cook = role('cook', ['order.prepare']);
    const cleaner = role('cleaner', [
      'cleaning.task.view',
      'cleaning.task.complete',
    ]);
    roleRepo.find.mockResolvedValue([cook, cleaner]);
    const subject = employee('cook');
    subject.additionalRoles = [cleaner];
    const access = await service.resolve(subject);
    expect(access.capabilities.canPrepareOrders).toBe(true);
    expect(access.capabilities.canCompleteCleaningTasks).toBe(true);
    expect(access.capabilities.canDeliverOrders).toBe(false);
  });
});

describe('AccessPolicyService.resolveAsRole — impersonation "tester ce rôle"', () => {
  const roleRepo = { find: jest.fn(), findOne: jest.fn() };
  let service: AccessPolicyService;
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AccessPolicyService,
        { provide: getRepositoryToken(Role), useValue: roleRepo },
      ],
    }).compile();
    service = module.get(AccessPolicyService);
  });

  it('throws when the target role does not exist', async () => {
    roleRepo.findOne.mockResolvedValue(null);
    await expect(
      service.resolveAsRole(employee('actor-role'), 'missing-role'),
    ).rejects.toThrow(NotFoundException);
  });

  it('simulates a client role, deriving scope and companyId from the role', async () => {
    const clientRole = role('client-role', ['catalog.view']);
    clientRole.scope = RoleScope.CLIENT;
    clientRole.companyId = 'co-target';
    roleRepo.findOne.mockResolvedValue(clientRole);
    roleRepo.find.mockResolvedValue([clientRole]);

    const access = await service.resolveAsRole(
      employee('actor-role'),
      'client-role',
    );

    expect(access.employee.scope).toBe(EmployeeScope.CLIENT);
    expect(access.employee.companyId).toBe('co-target');
    // CLIENT_BASE_PERMISSIONS s'ajoutent toujours au scope CLIENT
    expect(access.permissions).toEqual(
      expect.arrayContaining(['catalog.view', 'order.create']),
    );
  });

  it('never simulates a role carrying company.manage (anti-escalade)', async () => {
    const superadminRole = role('superadmin-role', ['company.manage']);
    roleRepo.findOne.mockResolvedValue(superadminRole);
    roleRepo.find.mockResolvedValue([superadminRole]);

    const access = await service.resolveAsRole(
      employee('actor-role'),
      'superadmin-role',
    );

    // resolveAsRole lui-même ne bloque pas — la garde vit dans AuthService,
    // qui inspecte ce résultat avant d'activer la simulation.
    expect(access.permissions).toContain('company.manage');
  });
});
