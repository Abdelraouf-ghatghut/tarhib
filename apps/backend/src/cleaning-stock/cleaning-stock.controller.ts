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
import { CreateCleaningStockRequestDto } from './dto/cleaning-stock.dto.js';
import { CleaningStockRequestStatus } from './entities/cleaning-stock-request.entity.js';
import { CleaningStockService } from './cleaning-stock.service.js';
@Controller('cleaning')
export class CleaningStockController {
  constructor(private service: CleaningStockService) {}
  @Get('products')
  @RequireAnyPermission('cleaning.product.view', 'cleaning.product.manage')
  products() {
    return this.service.listProducts();
  }
  @Get('stock')
  @RequireAnyPermission('cleaning.product.view', 'cleaning.product.manage')
  stock(
    @CurrentUser() u: JwtPayload,
    @Query('companyId') c?: string,
    @Query('branchId') b?: string,
  ) {
    const s = constrainRequestedScope(u, { companyId: c, branchId: b });
    return this.service.listStock(s.companyId, s.branchId);
  }
  @Get('stock-requests')
  @RequireAnyPermission('cleaning.product.request', 'cleaning.product.manage')
  requests(
    @CurrentUser() u: JwtPayload,
    @Query('companyId') c?: string,
    @Query('branchId') b?: string,
  ) {
    const s = constrainRequestedScope(u, { companyId: c, branchId: b });
    return this.service.listRequests(s.companyId, s.branchId);
  }
  @Post('stock-requests')
  @RequireAnyPermission('cleaning.product.request', 'cleaning.product.manage')
  create(
    @CurrentUser() u: JwtPayload,
    @Body() dto: CreateCleaningStockRequestDto,
  ) {
    assertResourceScope(u, dto);
    return this.service.createRequest(dto, u.employeeId ?? u.sub);
  }
  @Patch('stock-requests/:id/approve')
  @RequireAnyPermission('cleaning.product.manage')
  async approve(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    assertResourceScope(u, await this.service.oneRequest(id));
    return this.service.transition(id, CleaningStockRequestStatus.APPROVED);
  }
  @Patch('stock-requests/:id/fulfill')
  @RequireAnyPermission('cleaning.product.manage')
  async fulfill(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    assertResourceScope(u, await this.service.oneRequest(id));
    return this.service.transition(id, CleaningStockRequestStatus.FULFILLED);
  }
}
