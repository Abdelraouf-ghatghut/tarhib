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
import { InventoryAdjustmentDto } from './dto/inventory-adjustment.dto.js';
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
import { parsePagination } from '../common/pagination.js';
import {
  CreateInventoryItemDto,
  InventoryItemDto,
  StockZone,
  UpdateInventoryItemDto,
} from './dto/inventory.dto.js';
import { InventoryService } from './inventory.service.js';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @RequireAnyPermission('inventory.create', 'stock.manage', 'inventory.manage')
  @ApiOperation({
    summary: 'Créer un article de stock pour un produit/branche',
  })
  @ApiResponse({ status: 201, type: InventoryItemDto })
  create(
    @Body() dto: CreateInventoryItemDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryItemDto> {
    assertResourceScope(user, dto);
    return this.inventoryService.create(dto);
  }

  @Get()
  @RequireAnyPermission(
    'stock.view',
    'stock.kitchen.view',
    'inventory.view',
    'inventory.manage',
  )
  @ApiOperation({
    summary: 'Lister le stock (filtrable par companyId / branchId / zone)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'zone', required: false, enum: StockZone })
  @ApiQuery({ name: 'page', required: false, description: 'Défaut 1' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Défaut 200, max 500',
  })
  @ApiResponse({ status: 200, type: [InventoryItemDto] })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('zone') zone?: StockZone,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<InventoryItemDto[]> {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    const permittedZone =
      user.permissions.includes('stock.kitchen.view') &&
      !user.permissions.some((permission) =>
        ['stock.view', 'stock.manage', 'inventory.manage'].includes(permission),
      )
        ? StockZone.KITCHEN
        : zone;
    const { skip, limit: take } = parsePagination(page, limit);
    return this.inventoryService.findAll(
      scope.companyId,
      scope.branchId,
      permittedZone,
      skip,
      take,
    );
  }

  @Get('alerts/below-threshold')
  @RequireAnyPermission(
    'alert.view',
    'inventory.view',
    'stock.view',
    'inventory.manage',
  )
  @ApiOperation({
    summary: 'Produits sous le seuil minimum (filtrable par zone)',
  })
  @ApiQuery({ name: 'companyId', required: true })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'zone', required: false, enum: StockZone })
  @ApiResponse({ status: 200, type: [InventoryItemDto] })
  findBelowThreshold(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId: string,
    @Query('branchId') branchId?: string,
    @Query('zone') zone?: StockZone,
  ): Promise<InventoryItemDto[]> {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    return this.inventoryService.findBelowThreshold(
      scope.companyId!,
      scope.branchId,
      zone,
    );
  }

  @Get(':id')
  @RequireAnyPermission(
    'stock.view',
    'stock.kitchen.view',
    'inventory.view',
    'inventory.manage',
  )
  @ApiOperation({ summary: 'Récupérer un article de stock par ID' })
  @ApiResponse({ status: 200, type: InventoryItemDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryItemDto> {
    const item = await this.inventoryService.findOne(id);
    assertResourceScope(user, item);
    return item;
  }

  @Patch(':id')
  @RequireAnyPermission('inventory.update', 'stock.manage', 'inventory.manage')
  @ApiOperation({ summary: 'Mettre à jour la quantité ou les seuils' })
  @ApiResponse({ status: 200, type: InventoryItemDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryItemDto> {
    assertResourceScope(user, await this.inventoryService.findOne(id));
    return this.inventoryService.update(id, dto);
  }

  @Post(':id/adjust')
  @RequireAnyPermission('inventory.adjust', 'stock.manage', 'inventory.manage')
  @ApiOperation({
    summary: 'Ajustement de stock : sortie ou correction absolue (TARHIB-41)',
  })
  @ApiResponse({ status: 201, type: InventoryItemDto })
  async adjust(
    @Param('id') id: string,
    @Body() dto: InventoryAdjustmentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryItemDto> {
    assertResourceScope(user, await this.inventoryService.findOne(id));
    return this.inventoryService.adjustAtomic(id, dto);
  }
}
