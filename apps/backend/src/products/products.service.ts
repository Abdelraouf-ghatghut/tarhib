import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity.js';
import {
  CreateProductDto,
  ProductAdminDto,
  ProductDto,
  ProductType,
} from './dto/product.dto.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductDto> {
    const entity = this.repo.create({
      nameAr: dto.nameAr,
      nameEn: dto.nameEn,
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
  async findAll(callerRole?: string): Promise<ProductDto[]> {
    const isAdmin = callerRole === 'ADMIN';
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.active = true')
      .orderBy('p.nameEn', 'ASC');

    if (!isAdmin) {
      qb.andWhere('p.type = :type', { type: ProductType.COMMANDABLE });
    }

    const entities = await qb.getMany();

    // Filter by allowedRoles if the product has role restrictions
    if (!isAdmin && callerRole) {
      return entities
        .filter((e) => !e.allowedRoles || e.allowedRoles.includes(callerRole))
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
    if (dto.nameEn !== undefined) entity.nameEn = dto.nameEn;
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
