import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from './entities/product.entity.js';
import { ProductFavorite } from './entities/product-favorite.entity.js';
import { ProductRecipeLine } from './entities/product-recipe-line.entity.js';
import {
  CatalogSnapshotDto,
  CatalogVersionDto,
  CreateProductDto,
  CreateRecipeLineDto,
  ProductAdminDto,
  ProductAvailabilityDto,
  ProductDto,
  ProductType,
  RecipeLineDto,
} from './dto/product.dto.js';
import {
  InventoryItem,
  StockZone,
} from '../inventory/entities/inventory-item.entity.js';
import { RedisService } from '../redis/redis.service.js';

const CATALOG_VERSION_KEY = 'catalog:version';
const CATALOG_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

@Injectable()
export class ProductsService {
  // Single-flight (PR-1.6) : juste après une invalidation (ou pendant une
  // panne Redis), plusieurs requêtes concurrentes manquent le cache en même
  // temps — sans ceci, chacune relançait indépendamment le calcul (requête
  // MAX(updatedAt) ou findAll() complet) au lieu de partager le même calcul
  // en cours. Portée process (une seule instance backend) : suffisant, le
  // pire cas sans coordination inter-instance reste un cache write dupliqué,
  // jamais une incohérence.
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    @InjectRepository(ProductFavorite)
    private readonly favoritesRepo: Repository<ProductFavorite>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(ProductRecipeLine)
    private readonly recipeRepo: Repository<ProductRecipeLine>,
    private readonly redis: RedisService,
  ) {}

  private singleFlight<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) return existing as Promise<T>;
    const promise = compute().finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }

  private async readRedis(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch {
      // Le catalogue reste disponible si Redis est momentanément indisponible.
      return null;
    }
  }

  private async writeRedis(key: string, value: string): Promise<void> {
    try {
      await this.redis.set(key, value, CATALOG_CACHE_TTL_SECONDS);
    } catch {
      // Cache best-effort : PostgreSQL reste la source de vérité.
    }
  }

  private async publishCatalogVersion(updatedAt?: Date): Promise<string> {
    const version = (updatedAt ?? new Date()).toISOString();
    await this.writeRedis(CATALOG_VERSION_KEY, version);
    return version;
  }

  /**
   * isPurchased/isSold/isVipSelfService dérivés de `type` si non fournis —
   * garde la création fonctionnelle tant que les points de lecture n'ont pas
   * basculé sur les nouveaux flags (chantier nomenclature en cours).
   */
  private deriveFlags(dto: {
    type: ProductType;
    isPurchased?: boolean;
    isSold?: boolean;
    isVipSelfService?: boolean;
  }): { isPurchased: boolean; isSold: boolean; isVipSelfService: boolean } {
    const isVip = dto.type === ProductType.LIBRE_SERVICE_VIP;
    return {
      isPurchased: dto.isPurchased ?? true,
      isSold: dto.isSold ?? !isVip,
      isVipSelfService: dto.isVipSelfService ?? isVip,
    };
  }

  async create(dto: CreateProductDto): Promise<ProductDto> {
    const entity = this.repo.create({
      nameAr: dto.nameAr,
      nameEn: dto.nameEn?.trim() || null,
      category: dto.category,
      type: dto.type,
      allowedRoles: dto.allowedRoles ?? null,
      allowedBranches: dto.allowedBranches ?? null,
      imageUrl: dto.imageUrl ?? null,
      allergens: dto.allergens?.filter(Boolean) ?? null,
      nutrition: dto.nutrition ?? null,
      unitCost: dto.unitCost ?? null,
      unit: dto.unit ?? null,
      purchaseUnit: dto.purchaseUnit ?? null,
      unitsPerPurchase: dto.unitsPerPurchase ?? 1,
      active: dto.active ?? true,
      ...this.deriveFlags(dto),
    });
    const saved = await this.repo.save(entity);
    await this.publishCatalogVersion(saved.updatedAt);
    return this.toDto(saved);
  }

  async getCatalogVersion(): Promise<CatalogVersionDto> {
    const cached = await this.readRedis(CATALOG_VERSION_KEY);
    const version = cached
      ? cached
      : await this.singleFlight(CATALOG_VERSION_KEY, async () => {
          const raw = await this.repo
            .createQueryBuilder('p')
            .select('MAX(p.updatedAt)', 'updatedAt')
            .getRawOne<{ updatedAt?: Date | string | null }>();
          const updatedAt = raw?.updatedAt
            ? new Date(raw.updatedAt)
            : new Date(0);
          const computed = updatedAt.toISOString();
          await this.writeRedis(CATALOG_VERSION_KEY, computed);
          return computed;
        });

    return { version, updatedAt: version };
  }

  async getCatalogSnapshot(
    callerRole?: string,
    callerRoleId?: string,
    callerBranchId?: string,
  ): Promise<CatalogSnapshotDto> {
    const { version, updatedAt } = await this.getCatalogVersion();
    const audience = [
      callerRole ?? 'anonymous',
      callerRoleId ?? 'no-role',
      callerBranchId ?? 'no-branch',
    ].join(':');
    const cacheKey = `catalog:snapshot:${version}:${audience}`;
    const cached = await this.readRedis(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as CatalogSnapshotDto;
      } catch {
        // Une entrée de cache illisible est simplement reconstruite.
      }
    }

    return this.singleFlight(cacheKey, async () => {
      const snapshot: CatalogSnapshotDto = {
        version,
        updatedAt,
        products: await this.findAll(callerRole, callerRoleId, callerBranchId),
      };
      await this.writeRedis(cacheKey, JSON.stringify(snapshot));
      return snapshot;
    });
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
      qb.andWhere('p.is_sold = true');
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
    if (dto.nameEn !== undefined) entity.nameEn = dto.nameEn?.trim() || null;
    if (dto.category !== undefined) entity.category = dto.category;
    if (dto.type !== undefined) {
      entity.type = dto.type;
      const flags = this.deriveFlags({ type: dto.type });
      if (dto.isPurchased === undefined) entity.isPurchased = flags.isPurchased;
      if (dto.isSold === undefined) entity.isSold = flags.isSold;
      if (dto.isVipSelfService === undefined)
        entity.isVipSelfService = flags.isVipSelfService;
    }
    if (dto.isPurchased !== undefined) entity.isPurchased = dto.isPurchased;
    if (dto.isSold !== undefined) entity.isSold = dto.isSold;
    if (dto.isVipSelfService !== undefined)
      entity.isVipSelfService = dto.isVipSelfService;
    if (dto.allowedRoles !== undefined)
      entity.allowedRoles = dto.allowedRoles ?? null;
    if (dto.allowedBranches !== undefined)
      entity.allowedBranches = dto.allowedBranches ?? null;
    if (dto.imageUrl !== undefined) entity.imageUrl = dto.imageUrl ?? null;
    if (dto.allergens !== undefined)
      entity.allergens = dto.allergens?.filter(Boolean) ?? null;
    if (dto.nutrition !== undefined) entity.nutrition = dto.nutrition ?? null;
    if (dto.unitCost !== undefined) entity.unitCost = dto.unitCost ?? null;
    if (dto.unit !== undefined) entity.unit = dto.unit ?? null;
    if (dto.purchaseUnit !== undefined)
      entity.purchaseUnit = dto.purchaseUnit ?? null;
    if (dto.unitsPerPurchase !== undefined)
      entity.unitsPerPurchase = dto.unitsPerPurchase;
    if (dto.active !== undefined) entity.active = dto.active;
    const saved = await this.repo.save(entity);
    await this.publishCatalogVersion(saved.updatedAt);
    return this.toDto(saved);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Product ${id} not found`);
    entity.active = false;
    const saved = await this.repo.save(entity);
    await this.publishCatalogVersion(saved.updatedAt);
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
        where: { active: true, isSold: true },
      }),
      this.inventoryRepo.find({
        where: {
          companyId,
          branchId,
          zone: In([StockZone.KITCHEN, StockZone.BRANCH]),
        },
      }),
    ]);
    // Disponibilité = available (quantity - reserved) sommé cuisine + branche,
    // cohérent avec la réservation à la commande (D1=B).
    const availableByProduct = new Map<string, number>();
    for (const s of stocks) {
      availableByProduct.set(
        s.productId,
        (availableByProduct.get(s.productId) ?? 0) +
          (s.quantity - (s.reserved ?? 0)),
      );
    }

    return products.map((p) => {
      const dto = new ProductAvailabilityDto();
      dto.productId = p.id;
      dto.quantity = availableByProduct.get(p.id) ?? 0;
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
    dto.imageUrl = e.imageUrl;
    dto.allergens = e.allergens;
    dto.nutrition = e.nutrition;
    dto.active = e.active;
    dto.isPurchased = e.isPurchased;
    dto.isSold = e.isSold;
    dto.isVipSelfService = e.isVipSelfService;
    dto.unit = e.unit;
    dto.purchaseUnit = e.purchaseUnit ?? undefined;
    dto.unitsPerPurchase = e.unitsPerPurchase;
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
    dto.imageUrl = e.imageUrl;
    dto.allergens = e.allergens;
    dto.nutrition = e.nutrition;
    dto.active = e.active;
    dto.isPurchased = e.isPurchased;
    dto.isSold = e.isSold;
    dto.isVipSelfService = e.isVipSelfService;
    dto.unit = e.unit;
    dto.purchaseUnit = e.purchaseUnit ?? undefined;
    dto.unitsPerPurchase = e.unitsPerPurchase;
    dto.unitCost = e.unitCost ? Number(e.unitCost) : null;
    return dto;
  }

  /**
   * Nomenclature (BOM) — un produit vendu composé consomme des ingrédients
   * suivis en stock séparément. Pas de recette imbriquée : un ingrédient ne
   * peut pas lui-même avoir une recette (garde le modèle simple, YAGNI —
   * ajouter si un vrai besoin de sous-recette apparaît).
   */
  async getRecipe(productId: string): Promise<RecipeLineDto[]> {
    const lines = await this.recipeRepo.find({ where: { productId } });
    return lines.map((l) => this.toRecipeLineDto(l));
  }

  async addRecipeLine(
    productId: string,
    dto: CreateRecipeLineDto,
  ): Promise<RecipeLineDto> {
    if (dto.ingredientProductId === productId) {
      throw new BadRequestException('recipeLineCannotReferenceItself');
    }
    const [product, ingredient, ingredientHasOwnRecipe, productIsIngredient] =
      await Promise.all([
        this.repo.findOne({ where: { id: productId } }),
        this.repo.findOne({ where: { id: dto.ingredientProductId } }),
        this.recipeRepo.findOne({
          where: { productId: dto.ingredientProductId },
        }),
        this.recipeRepo.findOne({
          where: { ingredientProductId: productId },
        }),
      ]);
    if (!product || !ingredient) {
      throw new NotFoundException('Produit ou ingrédient introuvable');
    }
    if (ingredientHasOwnRecipe || productIsIngredient) {
      throw new BadRequestException('recipeNestingNotSupported');
    }
    const existing = await this.recipeRepo.findOne({
      where: { productId, ingredientProductId: dto.ingredientProductId },
    });
    if (existing) {
      throw new BadRequestException('recipeLineAlreadyExists');
    }
    const saved = await this.recipeRepo.save(
      this.recipeRepo.create({
        productId,
        ingredientProductId: dto.ingredientProductId,
        quantity: dto.quantity,
      }),
    );
    return this.toRecipeLineDto(saved);
  }

  async removeRecipeLine(lineId: string): Promise<void> {
    const line = await this.recipeRepo.findOne({ where: { id: lineId } });
    if (!line) throw new NotFoundException(`Recipe line ${lineId} not found`);
    await this.recipeRepo.remove(line);
  }

  /** Utilisé par OrdersService pour construire le contexte du moteur de validation. */
  async recipeSnapshotsFor(
    productIds: string[],
  ): Promise<
    { productId: string; ingredientProductId: string; quantity: number }[]
  > {
    if (productIds.length === 0) return [];
    const lines = await this.recipeRepo.find({
      where: { productId: In(productIds) },
    });
    return lines.map((l) => ({
      productId: l.productId,
      ingredientProductId: l.ingredientProductId,
      quantity: l.quantity,
    }));
  }

  private toRecipeLineDto(l: ProductRecipeLine): RecipeLineDto {
    const dto = new RecipeLineDto();
    dto.id = l.id;
    dto.productId = l.productId;
    dto.ingredientProductId = l.ingredientProductId;
    dto.quantity = l.quantity;
    return dto;
  }
}
