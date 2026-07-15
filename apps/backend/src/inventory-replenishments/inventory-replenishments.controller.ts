import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequireAnyPermission } from '../auth/decorators/require-permission.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import {
  assertResourceScope,
  constrainRequestedScope,
} from '../common/access/request-scope.js';
import { InventoryReplenishmentsService } from './inventory-replenishments.service.js';
@Controller('inventory-replenishments')
export class InventoryReplenishmentsController {
  constructor(private readonly service: InventoryReplenishmentsService) {}
  @Get()
  @RequireAnyPermission(
    'stock.kitchen.request',
    'stock.transfer',
    'inventory.manage',
  )
  list(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ) {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    return this.service.findAll(scope.companyId, scope.branchId);
  }
  @Post()
  @RequireAnyPermission('stock.kitchen.request')
  create(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      companyId: string;
      branchId: string;
      productId: string;
      requestedQty: number;
      note?: string;
    },
  ) {
    assertResourceScope(user, body);
    return this.service.create(body, user.employeeId ?? user.sub);
  }
  @Patch(':id/approve')
  @RequireAnyPermission('stock.transfer', 'inventory.manage')
  async approve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const item = await this.service.findOne(id);
    assertResourceScope(user, item);
    return this.service.approve(id, user.employeeId ?? user.sub);
  }
  @Patch(':id/fulfill')
  @RequireAnyPermission('stock.transfer', 'inventory.manage')
  async fulfill(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const item = await this.service.findOne(id);
    assertResourceScope(user, item);
    return this.service.fulfill(id, user.employeeId ?? user.sub);
  }
  @Patch(':id/reject')
  @RequireAnyPermission('stock.transfer', 'inventory.manage')
  async reject(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    const item = await this.service.findOne(id);
    assertResourceScope(user, item);
    return this.service.reject(id, user.employeeId ?? user.sub, note);
  }
}
