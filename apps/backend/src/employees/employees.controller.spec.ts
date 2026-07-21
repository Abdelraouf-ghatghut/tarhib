import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let service: { findOne: jest.Mock; findAll: jest.Mock };

  beforeEach(async () => {
    service = { findOne: jest.fn(), findAll: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      // Squelette : le service est mocké, la logique est testée dans les
      // specs de service et le smoke test de bout en bout
      providers: [{ provide: EmployeesService, useValue: service }],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findOne — isolation multi-tenant (IDOR)', () => {
    const branchUser: JwtPayload = {
      sub: 'emp-1',
      email: 'e@co-a.com',
      role: 'EMPLOYEE',
      permissions: [],
      dataScope: 'BRANCH',
      companyId: 'co-A',
      branchId: 'br-A',
    };

    it('rejects reading an employee belonging to another company', async () => {
      service.findOne.mockResolvedValue({
        id: 'emp-2',
        companyId: 'co-B',
        branchId: 'br-B',
      });

      await expect(controller.findOne('emp-2', branchUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows reading an employee within the caller’s own company/branch', async () => {
      service.findOne.mockResolvedValue({
        id: 'emp-2',
        companyId: 'co-A',
        branchId: 'br-A',
      });

      await expect(
        controller.findOne('emp-2', branchUser),
      ).resolves.toMatchObject({ id: 'emp-2' });
    });

    it('allows a GLOBAL-scoped caller (superadmin) to read any company', async () => {
      const globalUser: JwtPayload = { ...branchUser, dataScope: 'GLOBAL' };
      service.findOne.mockResolvedValue({
        id: 'emp-2',
        companyId: 'co-B',
        branchId: 'br-B',
      });

      await expect(
        controller.findOne('emp-2', globalUser),
      ).resolves.toMatchObject({ id: 'emp-2' });
    });
  });

  describe('findAll — le scope du JWT prime sur les filtres fournis', () => {
    it('forces companyId to the caller’s own company when not GLOBAL-scoped', async () => {
      const branchUser: JwtPayload = {
        sub: 'emp-1',
        email: 'e@co-a.com',
        role: 'EMPLOYEE',
        permissions: [],
        dataScope: 'BRANCH',
        companyId: 'co-A',
        branchId: 'br-A',
      };

      await controller.findAll(branchUser);

      expect(service.findAll).toHaveBeenCalledWith(
        'co-A',
        'br-A',
        undefined,
        undefined,
        undefined,
        undefined,
        0,
        200,
      );
    });

    it('rejects a companyId filter outside the caller’s scope', () => {
      const branchUser: JwtPayload = {
        sub: 'emp-1',
        email: 'e@co-a.com',
        role: 'EMPLOYEE',
        permissions: [],
        dataScope: 'BRANCH',
        companyId: 'co-A',
        branchId: 'br-A',
      };

      // constrainRequestedScope rejette de façon synchrone, avant le retour
      // de la promesse — pas un throw async normal.
      expect(() => controller.findAll(branchUser, 'co-OTHER')).toThrow(
        ForbiddenException,
      );
    });
  });
});
