import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity.js';
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

    // Filter by allowedRoles if the product has role restrictions.
    // allowedRoles contient désormais des roleId (UUID) — le nom de rôle
    // legacy reste accepté pour la compatibilité des anciens produits.
    if (!isAdmin && (callerRole || callerRoleId)) {
      return entities
        .filter(
          (e) =>
            !e.allowedRoles ||
            (callerRole && e.allowedRoles.includes(callerRole)) ||
            (callerRoleId && e.allowedRoles.includes(callerRoleId)),
        )
        .map((e) => this.toDto(e));
    }

    return entities.map((e) => this.toDto(e));
  }

  async findOne(id: string): Promise<ProductDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Product ${id} not found`);
    return this.toDto(entity);
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
    dto.active = e.active;
    dto.unitCost = e.unitCost ? Number(e.unitCost) : null;
    return dto;
  }
}
