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
import { ProcurementService } from './procurement.service.js';
import {
  CreatePurchaseOrderDto,
  PurchaseOrderDto,
  ReceivePurchaseOrderDto,
} from './dto/procurement.dto.js';
import { PurchaseOrderStatus } from './entities/purchase-order.entity.js';

@ApiTags('procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('procurement')
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un bon de commande (DRAFT)' })
  @ApiResponse({ status: 201, type: PurchaseOrderDto })
  create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseOrderDto> {
    return this.service.create(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les bons de commande' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: PurchaseOrderStatus })
  @ApiResponse({ status: 200, type: [PurchaseOrderDto] })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: PurchaseOrderStatus,
  ): Promise<PurchaseOrderDto[]> {
    return this.service.findAll(companyId, branchId, status);
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: PurchaseOrderDto })
  findOne(@Param('id') id: string): Promise<PurchaseOrderDto> {
    return this.service.findOne(id);
  }

  @Patch(':id/send')
  @ApiOperation({ summary: 'Passer le BdC en statut SENT' })
  @ApiResponse({ status: 200, type: PurchaseOrderDto })
  send(@Param('id') id: string): Promise<PurchaseOrderDto> {
    return this.service.send(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler le BdC' })
  @ApiResponse({ status: 200, type: PurchaseOrderDto })
  cancel(@Param('id') id: string): Promise<PurchaseOrderDto> {
    return this.service.cancel(id);
  }

  @Patch(':id/receive')
  @ApiOperation({
    summary: 'Réceptionner des lignes → entrée stock automatique',
  })
  @ApiResponse({ status: 200, type: PurchaseOrderDto })
  receive(
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
  ): Promise<PurchaseOrderDto> {
    return this.service.receive(id, dto);
  }
}
