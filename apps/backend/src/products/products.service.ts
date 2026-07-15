import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity.js';
import { ProductFavorite } from './entities/product-favorite.entity.js';
import {
  CreateProductDto,
  ProductAdminDto,
  ProductAvailabilityDto,
  ProductDto,
  ProductType,
} from './dto/product.dto.js';
import {
  InventoryItem,
  StockZone,
} from '../inventory/entities/inventory-item.entity.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    @InjectRepository(ProductFavorite)
    private readonly favoritesRepo: Repository<ProductFavorite>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductDto> {
    const entity = this.repo.create({
      nameAr: dto.nameAr,
      // Anglais optionnel : repli sur l'arabe (colonne non-null)
      nameEn: dto.nameEn?.trim() || dto.nameAr,
      category: dto.category,
      type: dto.type,
      allowedRoles: dto.allowedRoles ?? null,
      allowedBranches: dto.allowedBranches ?? null,
      imageUrl: dto.imageUrl ?? null,
      unitCost: dto.unitCost ?? null,
    });
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  /**
   * Règle métier §3.2 et §4 (CLAUDE.md) :
   * Les produits LIBRE_SERVICE_VIP sont exclus pour tout rôle non-ADMIN.
   * Le filtrage est appliqué ici côté service, jamais uniquement en UI.
   */
  async findAll(
    callerRole?: string,
    callerRoleId?: string,
    callerBranchId?: string,
  ): Promise<ProductDto[]> {
    const isAdmin = callerRole === 'ADMIN';
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.active = true')
      .orderBy('p.nameEn', 'ASC');

    if (!isAdmin) {
      qb.andWhere('p.type = :type', { type: ProductType.COMMANDABLE });
    }

    const entities = await qb.getMany();

    if (isAdmin) return entities.map((e) => this.toDto(e));

    // Filter by allowedRoles if the product has role restrictions.
    // allowedRoles contient désormais des roleId (UUID) — le nom de rôle
    // legacy reste accepté pour la compatibilité des anciens produits.
    return (
      entities
        .filter(
          (e) =>
            !e.allowedRoles ||
            (callerRole && e.allowedRoles.includes(callerRole)) ||
            (callerRoleId && e.allowedRoles.includes(callerRoleId)),
        )
        // Filter by allowedBranches si le produit est restreint à certaines
        // branches — null/vide = commandable partout (même convention).
        .filter(
          (e) =>
            !e.allowedBranches ||
            e.allowedBranches.length === 0 ||
            (callerBranchId && e.allowedBranches.includes(callerBranchId)),
        )
        .map((e) => this.toDto(e))
    );
  }

  async findOne(id: string): Promise<ProductDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Product ${id} not found`);
    return this.toDto(entity);
  }

  async findFavoriteIds(employeeId: string): Promise<string[]> {
    const favorites = await this.favoritesRepo.find({
      select: { productId: true },
      where: { employeeId },
      order: { createdAt: 'DESC' },
    });
    return favorites.map((favorite) => favorite.productId);
  }

  async findFavorites(
    employeeId: string,
    callerRole?: string,
    callerRoleId?: string,
    callerBranchId?: string,
  ): Promise<ProductDto[]> {
    const favoriteIds = await this.findFavoriteIds(employeeId);
    if (favoriteIds.length === 0) return [];
    const products = await this.findAll(
      callerRole,
      callerRoleId,
      callerBranchId,
    );
    const favoriteSet = new Set(favoriteIds);
    return products.filter((product) => favoriteSet.has(product.id));
  }

  async addFavorite(employeeId: string, productId: string): Promise<string[]> {
    const product = await this.repo.findOne({
      where: { id: productId, active: true },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    await this.favoritesRepo.upsert({ employeeId, productId }, [
      'employeeId',
      'productId',
    ]);
    return this.findFavoriteIds(employeeId);
  }

  async removeFavorite(
    employeeId: string,
    productId: string,
  ): Promise<string[]> {
    await this.favoritesRepo.delete({ employeeId, productId });
    return this.findFavoriteIds(employeeId);
  }

  async update(
    id: string,
    dto: Partial<CreateProductDto>,
  ): Promise<ProductDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Product ${id} not found`);
    if (dto.nameAr !== undefined) entity.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined)
      entity.nameEn = dto.nameEn?.trim() || entity.nameAr;
    if (dto.category !== undefined) entity.category = dto.category;
    if (dto.type !== undefined) entity.type = dto.type;
    if (dto.allowedRoles !== undefined)
      entity.allowedRoles = dto.allowedRoles ?? null;
    if (dto.allowedBranches !== undefined)
      entity.allowedBranches = dto.allowedBranches ?? null;
    if (dto.imageUrl !== undefined) entity.imageUrl = dto.imageUrl ?? null;
    if (dto.unitCost !== undefined) entity.unitCost = dto.unitCost ?? null;
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Product ${id} not found`);
    entity.active = false;
    await this.repo.save(entity);
  }

  /**
   * Disponibilité stock des produits commandables pour le site (société +
   * branche) de l'appelant — permet à l'app mobile d'afficher "غير متوفر"
   * directement sur la carte produit, avant toute tentative de commande.
   * N'affecte pas findAll/isAdmin : méthode entièrement additive.
   */
  async findAvailability(
    companyId?: string,
    branchId?: string,
  ): Promise<ProductAvailabilityDto[]> {
    if (!companyId || !branchId) return [];

    const [products, stocks] = await Promise.all([
      this.repo.find({
        where: { active: true, type: ProductType.COMMANDABLE },
      }),
      this.inventoryRepo.find({
        where: { companyId, branchId, zone: StockZone.BRANCH },
      }),
    ]);
    const stockByProduct = new Map(
      stocks.map((s) => [s.productId, s.quantity]),
    );

    return products.map((p) => {
      const dto = new ProductAvailabilityDto();
      dto.productId = p.id;
      dto.quantity = stockByProduct.get(p.id) ?? 0;
      dto.available = dto.quantity > 0;
      return dto;
    });
  }

  /** Vue admin — inclut unitCost. Réservé aux endpoints non-employé. */
  async findAllAdmin(): Promise<ProductAdminDto[]> {
    const entities = await this.repo.find({ order: { nameEn: 'ASC' } });
    return entities.map((e) => this.toAdminDto(e));
  }

  async findOneAdmin(id: string): Promise<ProductAdminDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Product ${id} not found`);
    return this.toAdminDto(entity);
  }

  private toDto(e: Product): ProductDto {
    const dto = new ProductDto();
    dto.id = e.id;
    dto.nameAr = e.nameAr;
    dto.nameEn = e.nameEn;
    dto.category = e.category;
    dto.type = e.type;
    dto.allowedRoles = e.allowedRoles ?? undefined;
    dto.allowedBranches = e.allowedBranches ?? undefined;
    dto.active = e.active;
    // unitCost délibérément omis — jamais exposé dans le catalogue employé
    return dto;
  }

  toAdminDto(e: Product): ProductAdminDto {
    const dto = new ProductAdminDto();
    dto.id = e.id;
    dto.nameAr = e.nameAr;
    dto.nameEn = e.nameEn;
    dto.category = e.category;
    dto.type = e.type;
    dto.allowedRoles = e.allowedRoles ?? undefined;
    dto.allowedBranches = e.allowedBranches ?? undefined;
    dto.active = e.active;
    dto.unitCost = e.unitCost ? Number(e.unitCost) : null;
    return dto;
  }
}
