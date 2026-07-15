import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { Role, RoleScope, SlaPriority } from './entities/role.entity.js';
import { Permission } from './entities/permission.entity.js';
import { RoleQuota, QuotaPeriodType } from './entities/role-quota.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { MeetingRoom } from '../meeting-rooms/entities/meeting-room.entity.js';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

const mockRepo = () => ({
  create: jest.fn((v: unknown) => v),
  save: jest.fn((v: unknown) => Promise.resolve(v)),
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
  createQueryBuilder: jest.fn(() => ({
    innerJoin: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
  })),
});

const tarhibAdmin: JwtPayload = {
  sub: 'admin-1',
  email: 'a@tarhib.com',
  role: 'ADMIN',
  companyId: 'co-tarhib',
  permissions: ['role.manage'],
};

describe('RolesService', () => {
  let service: RolesService;
  let roleRepo: ReturnType<typeof mockRepo>;
  let quotaRepo: ReturnType<typeof mockRepo>;
  let employeeRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getRepositoryToken(Role), useFactory: mockRepo },
        { provide: getRepositoryToken(Permission), useFactory: mockRepo },
        { provide: getRepositoryToken(RoleQuota), useFactory: mockRepo },
        { provide: getRepositoryToken(Employee), useFactory: mockRepo },
        { provide: getRepositoryToken(MeetingRoom), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(RolesService);
    roleRepo = module.get(getRepositoryToken(Role));
    quotaRepo = module.get(getRepositoryToken(RoleQuota));
    employeeRepo = module.get(getRepositoryToken(Employee));

    roleRepo.save.mockImplementation((v: Partial<Role>) =>
      Promise.resolve({
        id: 'role-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...v,
      }),
    );
  });

  describe('create — quotasEnabled dérivé automatiquement', () => {
    it('sets quotasEnabled=true when at least one quota is provided', async () => {
      const dto = {
        companyId: 'co-1',
        nameAr: 'مسؤول',
        scope: RoleScope.CLIENT,
        slaPriority: SlaPriority.P2,
        quotas: [
          {
            productId: 'prod-1',
            periodType: QuotaPeriodType.MONTHLY,
            maxQuantity: 50,
          },
        ],
      };
      const result = await service.create(dto, tarhibAdmin);
      expect(result.quotasEnabled).toBe(true);
      expect(quotaRepo.save).toHaveBeenCalled();
    });

    it('sets quotasEnabled=false when no quota is provided', async () => {
      const dto = {
        companyId: 'co-1',
        nameAr: 'تجاري',
        scope: RoleScope.CLIENT,
        slaPriority: SlaPriority.P4,
      };
      const result = await service.create(dto, tarhibAdmin);
      expect(result.quotasEnabled).toBe(false);
    });

    it('ignores quotas for TARHIB roles', async () => {
      const dto = {
        nameAr: 'مشرف',
        scope: RoleScope.TARHIB,
        quotas: [
          {
            productId: 'prod-1',
            periodType: QuotaPeriodType.DAILY,
            maxQuantity: 5,
          },
        ],
      };
      const result = await service.create(dto, tarhibAdmin);
      expect(result.quotasEnabled).toBe(false);
      expect(quotaRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('create — nameEn optionnel', () => {
    it('stores null when nameEn is absent or blank', async () => {
      const dto = {
        companyId: 'co-1',
        nameAr: 'موظف',
        nameEn: '   ',
        scope: RoleScope.CLIENT,
      };
      const result = await service.create(dto, tarhibAdmin);
      expect(result.nameEn).toBeNull();
      expect(result.nameAr).toBe('موظف');
    });
  });

  describe('update', () => {
    it('replaces quotas and recomputes quotasEnabled', async () => {
      roleRepo.findOne.mockResolvedValue({
        id: 'role-1',
        companyId: 'co-1',
        nameAr: 'مسؤول',
        nameEn: null,
        scope: RoleScope.CLIENT,
        slaPriority: SlaPriority.P1,
        isSystem: false,
        quotasEnabled: true,
        permissions: [],
        quotas: [{ id: 'q-old' }],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update('role-1', { quotas: [] });
      expect(quotaRepo.delete).toHaveBeenCalledWith({ roleId: 'role-1' });
      expect(result.quotasEnabled).toBe(false);
    });

    it('allows modification of default (seeded) roles like any other role', async () => {
      roleRepo.findOne.mockResolvedValue({
        id: 'role-default',
        nameAr: 'old',
        permissions: [],
        quotas: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      roleRepo.save.mockImplementation((r: unknown) => Promise.resolve(r));

      const result = await service.update('role-default', { nameAr: 'x' });
      expect(result.nameAr).toBe('x');
    });
  });

  describe('remove', () => {
    it('rejects deletion when the role is currently assigned to employees', async () => {
      roleRepo.findOne.mockResolvedValue({ id: 'role-1' });
      employeeRepo.count.mockResolvedValue(3);
      await expect(service.remove('role-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(roleRepo.remove).not.toHaveBeenCalled();
    });

    it('allows deletion when no employee is assigned to the role, regardless of whether it was seeded by default', async () => {
      roleRepo.findOne.mockResolvedValue({ id: 'role-1' });
      employeeRepo.count.mockResolvedValue(0);
      await service.remove('role-1');
      expect(roleRepo.remove).toHaveBeenCalled();
    });
  });
});
