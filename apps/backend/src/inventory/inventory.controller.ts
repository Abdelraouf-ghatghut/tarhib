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
  @ApiOperation({
    summary: 'Créer un article de stock pour un produit/branche',
  })
  @ApiResponse({ status: 201, type: InventoryItemDto })
  create(@Body() dto: CreateInventoryItemDto): Promise<InventoryItemDto> {
    return this.inventoryService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lister le stock (filtrable par companyId / branchId / zone)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'zone', required: false, enum: StockZone })
  @ApiResponse({ status: 200, type: [InventoryItemDto] })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('zone') zone?: StockZone,
  ): Promise<InventoryItemDto[]> {
    return this.inventoryService.findAll(companyId, branchId, zone);
  }

  @Get('alerts/below-threshold')
  @ApiOperation({
    summary: 'Produits sous le seuil minimum (filtrable par zone)',
  })
  @ApiQuery({ name: 'companyId', required: true })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'zone', required: false, enum: StockZone })
  @ApiResponse({ status: 200, type: [InventoryItemDto] })
  findBelowThreshold(
    @Query('companyId') companyId: string,
    @Query('branchId') branchId?: string,
    @Query('zone') zone?: StockZone,
  ): Promise<InventoryItemDto[]> {
    return this.inventoryService.findBelowThreshold(companyId, branchId, zone);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un article de stock par ID' })
  @ApiResponse({ status: 200, type: InventoryItemDto })
  findOne(@Param('id') id: string): Promise<InventoryItemDto> {
    return this.inventoryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour la quantité ou les seuils' })
  @ApiResponse({ status: 200, type: InventoryItemDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    return this.inventoryService.update(id, dto);
  }

  @Post(':id/adjust')
  @ApiOperation({
    summary: 'Ajustement de stock : sortie ou correction absolue (TARHIB-41)',
  })
  @ApiResponse({ status: 201, type: InventoryItemDto })
  adjust(
    @Param('id') id: string,
    @Body() dto: InventoryAdjustmentDto,
  ): Promise<InventoryItemDto> {
    return this.inventoryService.adjust(id, dto);
  }
}
