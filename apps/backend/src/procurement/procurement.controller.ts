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
import { ProcurementService } from './procurement.service.js';
import {
  CreatePurchaseOrderDto,
  PurchaseOrderDto,
  ReceivePurchaseOrderDto,
  RejectPurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto/procurement.dto.js';
import { PurchaseOrderStatus } from './entities/purchase-order.entity.js';

@ApiTags('procurement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('procurement')
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  @Post()
  @RequireAnyPermission('procurement.create', 'procurement.manage')
  @ApiOperation({ summary: 'Créer un bon de commande (DRAFT)' })
  @ApiResponse({ status: 201, type: PurchaseOrderDto })
  create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseOrderDto> {
    assertResourceScope(user, dto);
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  @RequireAnyPermission('procurement.create', 'procurement.manage')
  @ApiOperation({ summary: 'Update a draft purchase order' })
  async updateDraft(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseOrderDto> {
    assertResourceScope(user, await this.service.findOne(id));
    return this.service.updateDraft(id, dto);
  }

  @Get()
  @RequireAnyPermission('procurement.view', 'procurement.manage')
  @ApiOperation({ summary: 'Lister les bons de commande' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: PurchaseOrderStatus })
  @ApiResponse({ status: 200, type: [PurchaseOrderDto] })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: PurchaseOrderStatus,
  ): Promise<PurchaseOrderDto[]> {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    return this.service.findAll(scope.companyId, scope.branchId, status);
  }

  @Get(':id')
  @RequireAnyPermission('procurement.view', 'procurement.manage')
  @ApiResponse({ status: 200, type: PurchaseOrderDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseOrderDto> {
    const order = await this.service.findOne(id);
    assertResourceScope(user, order);
    return order;
  }

  @Patch(':id/submit')
  @RequireAnyPermission('procurement.submit', 'procurement.manage')
  @ApiOperation({
    summary:
      'Soumettre le BdC pour validation — notifie le validateur de la branche',
  })
  @ApiResponse({ status: 200, type: PurchaseOrderDto })
  async submit(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseOrderDto> {
    assertResourceScope(user, await this.service.findOne(id));
    return this.service.submit(id);
  }

  @Patch(':id/validate')
  @RequireAnyPermission('procurement.validate', 'procurement.manage')
  @ApiOperation({
    summary: 'Valider le BdC — notifie le responsable achats de la branche',
  })
  @ApiResponse({ status: 200, type: PurchaseOrderDto })
  async validate(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseOrderDto> {
    assertResourceScope(user, await this.service.findOne(id));
    return this.service.validate(id, user.sub);
  }

  @Patch(':id/reject')
  @RequireAnyPermission('procurement.reject', 'procurement.manage')
  @ApiOperation({
    summary: 'Rejeter le BdC (repart en DRAFT) — notifie son créateur',
  })
  @ApiResponse({ status: 200, type: PurchaseOrderDto })
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectPurchaseOrderDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseOrderDto> {
    assertResourceScope(user, await this.service.findOne(id));
    return this.service.reject(id, dto, user.sub);
  }

  @Patch(':id/send')
  @RequireAnyPermission('procurement.send', 'procurement.manage')
  @ApiOperation({ summary: 'Passer le BdC en statut SENT (achat effectif)' })
  @ApiResponse({ status: 200, type: PurchaseOrderDto })
  async send(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseOrderDto> {
    assertResourceScope(user, await this.service.findOne(id));
    return this.service.send(id, user.sub);
  }

  @Patch(':id/cancel')
  @RequireAnyPermission('procurement.cancel', 'procurement.manage')
  @ApiOperation({ summary: 'Annuler le BdC' })
  @ApiResponse({ status: 200, type: PurchaseOrderDto })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseOrderDto> {
    assertResourceScope(user, await this.service.findOne(id));
    return this.service.cancel(id, user.sub);
  }

  @Patch(':id/receive')
  @RequireAnyPermission('procurement.receive', 'procurement.manage')
  @ApiOperation({
    summary: 'Réceptionner des lignes → entrée stock automatique',
  })
  @ApiResponse({ status: 200, type: PurchaseOrderDto })
  async receive(
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PurchaseOrderDto> {
    assertResourceScope(user, await this.service.findOne(id));
    return this.service.receiveAtomic(id, dto, user.sub);
  }
}
