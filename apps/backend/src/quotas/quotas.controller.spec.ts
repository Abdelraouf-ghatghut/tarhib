import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { QuotasController } from './quotas.controller';
import { QuotasService } from './quotas.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

describe('QuotasController', () => {
  let controller: QuotasController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const branchUser: JwtPayload = {
    sub: 'emp-1',
    email: 'e@co-a.com',
    role: 'EMPLOYEE',
    permissions: [],
    dataScope: 'BRANCH',
    companyId: 'co-A',
    branchId: 'br-A',
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotasController],
      providers: [{ provide: QuotasService, useValue: service }],
    }).compile();

    controller = module.get<QuotasController>(QuotasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll — scope IDOR', () => {
    it('forces companyId to the caller scope', async () => {
      service.findAll.mockResolvedValue([]);
      await controller.findAll(branchUser, undefined, undefined);
      expect(service.findAll).toHaveBeenCalledWith('co-A', undefined, 0, 200);
    });

    it('rejects an out-of-scope companyId filter', () => {
      expect(() =>
        controller.findAll(branchUser, 'co-OTHER', undefined),
      ).toThrow(ForbiddenException);
    });
  });

  describe('findOne — IDOR', () => {
    it('rejects reading a quota from another company', async () => {
      service.findOne.mockResolvedValue({ id: 'q-1', companyId: 'co-B' });
      await expect(controller.findOne('q-1', branchUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows reading a quota from the caller company', async () => {
      service.findOne.mockResolvedValue({ id: 'q-1', companyId: 'co-A' });
      await expect(controller.findOne('q-1', branchUser)).resolves.toEqual({
        id: 'q-1',
        companyId: 'co-A',
      });
    });
  });

  describe('update/remove — IDOR', () => {
    it('rejects updating a quota from another company', async () => {
      service.findOne.mockResolvedValue({ id: 'q-1', companyId: 'co-B' });
      await expect(controller.update('q-1', {}, branchUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.update).not.toHaveBeenCalled();
    });

    it('rejects removing a quota from another company', async () => {
      service.findOne.mockResolvedValue({ id: 'q-1', companyId: 'co-B' });
      await expect(controller.remove('q-1', branchUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(service.remove).not.toHaveBeenCalled();
    });
  });
});
