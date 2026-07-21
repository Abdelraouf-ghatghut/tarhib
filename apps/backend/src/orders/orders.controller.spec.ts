import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: { findOne: jest.Mock };

  beforeEach(async () => {
    service = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: service }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
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

    it('rejects reading an order belonging to another company', async () => {
      service.findOne.mockResolvedValue({
        id: 'ord-2',
        companyId: 'co-B',
        branchId: 'br-B',
      });

      await expect(controller.findOne('ord-2', branchUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows reading an order within the caller’s own company/branch', async () => {
      service.findOne.mockResolvedValue({
        id: 'ord-2',
        companyId: 'co-A',
        branchId: 'br-A',
      });

      await expect(
        controller.findOne('ord-2', branchUser),
      ).resolves.toMatchObject({ id: 'ord-2' });
    });
  });
});
