import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { SuppliersService } from './suppliers.service.js';
import {
  CreateSupplierDto,
  ProductPriceDto,
  SetProductPricesDto,
  SupplierDto,
} from './dto/supplier.dto.js';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un fournisseur' })
  @ApiResponse({ status: 201, type: SupplierDto })
  create(@Body() dto: CreateSupplierDto): Promise<SupplierDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lister les fournisseurs — ressource Tarhib globale, non liée à une société cliente',
  })
  @ApiResponse({ status: 200, type: [SupplierDto] })
  findAll(): Promise<SupplierDto[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: SupplierDto })
  findOne(@Param('id') id: string): Promise<SupplierDto> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiResponse({ status: 200, type: SupplierDto })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSupplierDto>,
  ): Promise<SupplierDto> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }

  @Get(':id/product-prices')
  @ApiOperation({
    summary: 'Prix pratiqués par ce fournisseur, produit par produit',
  })
  @ApiResponse({ status: 200, type: [ProductPriceDto] })
  getProductPrices(@Param('id') id: string): Promise<ProductPriceDto[]> {
    return this.service.getProductPrices(id);
  }

  @Put(':id/product-prices')
  @ApiOperation({
    summary:
      'Remplace le set de prix produits de ce fournisseur (pré-remplissage المشتريات)',
  })
  @ApiResponse({ status: 200, type: [ProductPriceDto] })
  setProductPrices(
    @Param('id') id: string,
    @Body() dto: SetProductPricesDto,
  ): Promise<ProductPriceDto[]> {
    return this.service.setProductPrices(id, dto.prices);
  }
}
