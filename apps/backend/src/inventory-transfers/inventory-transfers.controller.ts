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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
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
  @ApiOperation({
    summary: 'Créer un transfert de stock entre zones (CENTRAL→BRANCH→KITCHEN)',
  })
  @ApiResponse({ status: 201, type: InventoryTransferDto })
  create(
    @Body() dto: CreateInventoryTransferDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryTransferDto> {
    return this.service.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les transferts' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TransferStatus })
  @ApiResponse({ status: 200, type: [InventoryTransferDto] })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: TransferStatus,
  ): Promise<InventoryTransferDto[]> {
    return this.service.findAll(companyId, branchId, status);
  }

  @Patch(':id/confirm')
  @ApiOperation({
    summary:
      'Confirmer un transfert (débite la source, crédite la destination)',
  })
  @ApiResponse({ status: 200, type: InventoryTransferDto })
  confirm(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryTransferDto> {
    return this.service.confirm(id, user.sub);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler un transfert PENDING' })
  @ApiResponse({ status: 200, type: InventoryTransferDto })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryTransferDto> {
    return this.service.cancel(id, user.sub);
  }
}
