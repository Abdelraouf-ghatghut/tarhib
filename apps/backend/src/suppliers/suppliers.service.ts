import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity.js';
import {
  CreateSupplierDto,
  ProductPriceDto,
  ProductPriceInputDto,
  SupplierDto,
} from './dto/supplier.dto.js';
import { ProductSupplierPrice } from '../products/entities/product-supplier-price.entity.js';
import { Product } from '../products/entities/product.entity.js';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly repo: Repository<Supplier>,
    @InjectRepository(ProductSupplierPrice)
    private readonly priceRepo: Repository<ProductSupplierPrice>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(dto: CreateSupplierDto): Promise<SupplierDto> {
    const entity = this.repo.create({
      nameAr: dto.nameAr,
      nameEn: dto.nameEn?.trim() || null,
      contactName: dto.contactName ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
    });
    return this.toDto(await this.repo.save(entity));
  }

  async findAll(): Promise<SupplierDto[]> {
    const entities = await this.repo.find({
      where: { active: true },
      order: { nameEn: 'ASC' },
    });
    return entities.map((e) => this.toDto(e));
  }

  async findOne(id: string): Promise<SupplierDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Supplier ${id} not found`);
    return this.toDto(entity);
  }

  async update(
    id: string,
    dto: Partial<CreateSupplierDto>,
  ): Promise<SupplierDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Supplier ${id} not found`);
    if (dto.nameAr !== undefined) entity.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined) entity.nameEn = dto.nameEn?.trim() || null;
    if (dto.contactName !== undefined)
      entity.contactName = dto.contactName ?? null;
    if (dto.email !== undefined) entity.email = dto.email ?? null;
    if (dto.phone !== undefined) entity.phone = dto.phone ?? null;
    if (dto.address !== undefined) entity.address = dto.address ?? null;
    return this.toDto(await this.repo.save(entity));
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Supplier ${id} not found`);
    entity.active = false;
    await this.repo.save(entity);
  }

  /** Prix d'achat pratiqués par ce fournisseur, produit par produit. */
  async getProductPrices(supplierId: string): Promise<ProductPriceDto[]> {
    const rows = await this.priceRepo.find({ where: { supplierId } });
    return rows.map((r) => ({
      id: r.id,
      supplierId: r.supplierId,
      productId: r.productId,
      unitCost: Number(r.unitCost),
    }));
  }

  /** Remplace intégralement le set de prix produits de ce fournisseur. */
  async setProductPrices(
    supplierId: string,
    prices: ProductPriceInputDto[],
  ): Promise<ProductPriceDto[]> {
    const supplier = await this.repo.findOne({ where: { id: supplierId } });
    if (!supplier)
      throw new NotFoundException(`Supplier ${supplierId} not found`);

    if (prices.length) {
      const products = await this.productRepo.find({
        where: prices.map((p) => ({ id: p.productId })),
      });
      const known = new Set(products.map((p) => p.id));
      const unknown = prices.find((p) => !known.has(p.productId));
      if (unknown) {
        throw new NotFoundException(`Product ${unknown.productId} not found`);
      }
    }

    await this.priceRepo.delete({ supplierId });
    if (!prices.length) return [];

    const saved = await this.priceRepo.save(
      prices.map((p) =>
        this.priceRepo.create({
          supplierId,
          productId: p.productId,
          unitCost: p.unitCost,
        }),
      ),
    );
    return saved.map((r) => ({
      id: r.id,
      supplierId: r.supplierId,
      productId: r.productId,
      unitCost: Number(r.unitCost),
    }));
  }

  private toDto(e: Supplier): SupplierDto {
    const dto = new SupplierDto();
    dto.id = e.id;
    dto.nameAr = e.nameAr;
    dto.nameEn = e.nameEn;
    dto.contactName = e.contactName;
    dto.email = e.email;
    dto.phone = e.phone;
    dto.address = e.address;
    dto.active = e.active;
    return dto;
  }
}
