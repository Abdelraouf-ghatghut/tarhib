import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

describe('CompaniesController', () => {
  let controller: CompaniesController;
  let service: { findAll: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    service = { findAll: jest.fn(), findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      // Squelette : le service est mocké, la logique est testée dans les
      // specs de service et le smoke test de bout en bout
      providers: [{ provide: CompaniesService, useValue: service }],
    }).compile();

    controller = module.get<CompaniesController>(CompaniesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll — énumération des tenants (IDOR)', () => {
    it('returns only the caller’s own company when not GLOBAL-scoped', async () => {
      const user: JwtPayload = {
        sub: 'emp-1',
        email: 'e@co-a.com',
        role: 'EMPLOYEE',
        permissions: [],
        dataScope: 'BRANCH',
        companyId: 'co-A',
      };
      service.findOne.mockResolvedValue({ id: 'co-A', nameAr: 'A' });

      const result = await controller.findAll(user);

      expect(service.findOne).toHaveBeenCalledWith('co-A');
      expect(service.findAll).not.toHaveBeenCalled();
      expect(result).toEqual([{ id: 'co-A', nameAr: 'A' }]);
    });

    it('returns every company for a GLOBAL-scoped caller (company.manage)', async () => {
      const user: JwtPayload = {
        sub: 'admin-1',
        email: 'admin@tarhib.app',
        role: 'ADMIN',
        permissions: ['company.manage'],
        dataScope: 'GLOBAL',
        companyId: 'co-A',
      };
      service.findAll.mockResolvedValue([{ id: 'co-A' }, { id: 'co-B' }]);

      const result = await controller.findAll(user);

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne — pas de lecture d’une autre société hors portée GLOBAL', () => {
    it('rejects reading another company', async () => {
      const user: JwtPayload = {
        sub: 'emp-1',
        email: 'e@co-a.com',
        role: 'EMPLOYEE',
        permissions: [],
        dataScope: 'BRANCH',
        companyId: 'co-A',
      };

      await expect(controller.findOne('co-B', user)).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.findOne).not.toHaveBeenCalled();
    });

    it('allows reading the caller’s own company', async () => {
      const user: JwtPayload = {
        sub: 'emp-1',
        email: 'e@co-a.com',
        role: 'EMPLOYEE',
        permissions: [],
        dataScope: 'BRANCH',
        companyId: 'co-A',
      };
      service.findOne.mockResolvedValue({ id: 'co-A' });

      await expect(controller.findOne('co-A', user)).resolves.toEqual({
        id: 'co-A',
      });
    });
  });
});
