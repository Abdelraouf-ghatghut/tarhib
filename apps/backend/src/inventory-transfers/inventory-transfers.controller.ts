import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RequireAnyPermission } from '../auth/decorators/require-permission.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import {
  assertResourceScope,
  constrainRequestedScope,
} from '../common/access/request-scope.js';
import { InventoryTransfersService } from './inventory-transfers.service.js';
import {
  CreateInventoryTransferDto,
  InventoryTransferDto,
} from './dto/inventory-transfer.dto.js';
import { TransferStatus } from './entities/inventory-transfer.entity.js';

@ApiTags('inventory-transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory-transfers')
export class InventoryTransfersController {
  constructor(private readonly service: InventoryTransfersService) {}

  @Post()
  @RequireAnyPermission(
    'inventory.transfer.create',
    'stock.transfer',
    'inventory.manage',
  )
  @ApiOperation({
    summary: 'Créer un transfert de stock entre zones (CENTRAL→BRANCH→KITCHEN)',
  })
  @ApiResponse({ status: 201, type: InventoryTransferDto })
  create(
    @Body() dto: CreateInventoryTransferDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryTransferDto> {
    assertResourceScope(user, dto);
    return this.service.create(dto, user.sub);
  }

  @Get()
  @RequireAnyPermission(
    'inventory.transfer.view',
    'stock.transfer',
    'stock.view',
    'inventory.manage',
  )
  @ApiOperation({ summary: 'Lister les transferts' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TransferStatus })
  @ApiResponse({ status: 200, type: [InventoryTransferDto] })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: TransferStatus,
  ): Promise<InventoryTransferDto[]> {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    return this.service.findAll(scope.companyId, scope.branchId, status);
  }

  @Patch(':id/confirm')
  @RequireAnyPermission(
    'inventory.transfer.confirm',
    'stock.transfer',
    'inventory.manage',
  )
  @ApiOperation({
    summary:
      'Confirmer un transfert (débite la source, crédite la destination)',
  })
  @ApiResponse({ status: 200, type: InventoryTransferDto })
  async confirm(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryTransferDto> {
    assertResourceScope(user, await this.service.findOne(id));
    return this.service.confirmAtomic(id, user.sub);
  }

  @Patch(':id/cancel')
  @RequireAnyPermission(
    'inventory.transfer.cancel',
    'stock.transfer',
    'inventory.manage',
  )
  @ApiOperation({ summary: 'Annuler un transfert PENDING' })
  @ApiResponse({ status: 200, type: InventoryTransferDto })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryTransferDto> {
    assertResourceScope(user, await this.service.findOne(id));
    return this.service.cancel(id, user.sub);
  }
}
