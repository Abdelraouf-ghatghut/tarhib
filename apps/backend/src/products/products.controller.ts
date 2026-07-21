import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { RequireAnyPermission } from '../auth/decorators/require-permission.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import {
  CreateProductDto,
  CreateRecipeLineDto,
  ProductAdminDto,
  ProductAvailabilityDto,
  ProductDto,
  RecipeLineDto,
} from './dto/product.dto.js';
import { ProductsService } from './products.service.js';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('admin')
  @RequireAnyPermission('company.manage')
  @ApiOperation({
    summary: 'Liste admin (inclut unitCost) — ne jamais exposer côté employé',
  })
  @ApiResponse({ status: 200, type: [ProductAdminDto] })
  findAllAdmin(): Promise<ProductAdminDto[]> {
    return this.productsService.findAllAdmin();
  }

  @Post()
  @RequireAnyPermission('company.manage')
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
    return this.productsService.findAll(user.role, user.roleId, user.branchId);
  }

  @Get('availability')
  @ApiOperation({
    summary:
      'Disponibilité stock (branche de l\'appelant) — badge "non disponible" côté catalogue mobile',
  })
  @ApiResponse({ status: 200, type: [ProductAvailabilityDto] })
  findAvailability(
    @CurrentUser() user: JwtPayload,
  ): Promise<ProductAvailabilityDto[]> {
    return this.productsService.findAvailability(user.companyId, user.branchId);
  }

  @Get('favorites/ids')
  @ApiOperation({
    summary: 'Lister les IDs produits favoris de l employe connecte',
  })
  @ApiResponse({
    status: 200,
    schema: { type: 'array', items: { type: 'string' } },
  })
  findFavoriteIds(@CurrentUser() user: JwtPayload): Promise<string[]> {
    return this.productsService.findFavoriteIds(user.employeeId ?? user.sub);
  }

  @Get('favorites')
  @ApiOperation({
    summary: 'Lister les produits favoris de l employe connecte',
  })
  @ApiResponse({ status: 200, type: [ProductDto] })
  findFavorites(@CurrentUser() user: JwtPayload): Promise<ProductDto[]> {
    return this.productsService.findFavorites(
      user.employeeId ?? user.sub,
      user.role,
      user.roleId,
      user.branchId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un produit par ID' })
  @ApiResponse({ status: 200, type: ProductDto })
  findOne(@Param('id') id: string): Promise<ProductDto> {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @RequireAnyPermission('company.manage')
  @ApiOperation({ summary: 'Mettre à jour un produit' })
  @ApiResponse({ status: 200, type: ProductDto })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>,
  ): Promise<ProductDto> {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @RequireAnyPermission('company.manage')
  @HttpCode(204)
  @ApiOperation({ summary: 'Désactiver un produit (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.productsService.remove(id);
  }

  @Get(':id/recipe')
  @RequireAnyPermission('company.manage')
  @ApiOperation({ summary: 'Nomenclature (ingrédients) d’un produit composé' })
  @ApiResponse({ status: 200, type: [RecipeLineDto] })
  getRecipe(@Param('id') id: string): Promise<RecipeLineDto[]> {
    return this.productsService.getRecipe(id);
  }

  @Post(':id/recipe')
  @RequireAnyPermission('company.manage')
  @ApiOperation({ summary: 'Ajouter un ingrédient à la nomenclature (ADMIN)' })
  @ApiResponse({ status: 201, type: RecipeLineDto })
  addRecipeLine(
    @Param('id') id: string,
    @Body() dto: CreateRecipeLineDto,
  ): Promise<RecipeLineDto> {
    return this.productsService.addRecipeLine(id, dto);
  }

  @Delete('recipe/:lineId')
  @RequireAnyPermission('company.manage')
  @HttpCode(204)
  @ApiOperation({ summary: 'Retirer un ingrédient de la nomenclature (ADMIN)' })
  @ApiResponse({ status: 204 })
  removeRecipeLine(@Param('lineId') lineId: string): Promise<void> {
    return this.productsService.removeRecipeLine(lineId);
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: 'Ajouter un produit aux favoris employe' })
  @ApiResponse({
    status: 200,
    schema: { type: 'array', items: { type: 'string' } },
  })
  addFavorite(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<string[]> {
    // employeeId (résolu par JwtStrategy) — sub est l'ID Keycloak, la FK
    // product_favorites.employee_id pointe sur employees.id.
    return this.productsService.addFavorite(user.employeeId ?? user.sub, id);
  }

  @Delete(':id/favorite')
  @ApiOperation({ summary: 'Retirer un produit des favoris employe' })
  @ApiResponse({
    status: 200,
    schema: { type: 'array', items: { type: 'string' } },
  })
  removeFavorite(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<string[]> {
    return this.productsService.removeFavorite(user.employeeId ?? user.sub, id);
  }
}
