import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { CreateProductDto, ProductDto } from './dto/product.dto.js';
import { ProductsService } from './products.service.js';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un produit (ADMIN)' })
  @ApiResponse({ status: 201, type: ProductDto })
  create(@Body() dto: CreateProductDto): Promise<ProductDto> {
    return this.productsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Catalogue produits — LIBRE_SERVICE_VIP exclus pour les non-ADMIN (règle §3.2 CLAUDE.md)',
  })
  @ApiResponse({ status: 200, type: [ProductDto] })
  findAll(@CurrentUser() user: JwtPayload): Promise<ProductDto[]> {
    return this.productsService.findAll(user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un produit par ID' })
  @ApiResponse({ status: 200, type: ProductDto })
  findOne(@Param('id') id: string): Promise<ProductDto> {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un produit' })
  @ApiResponse({ status: 200, type: ProductDto })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>,
  ): Promise<ProductDto> {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Désactiver un produit (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.productsService.remove(id);
  }
}
