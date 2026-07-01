import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity.js';
import { CreateSupplierDto, SupplierDto } from './dto/supplier.dto.js';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly repo: Repository<Supplier>,
  ) {}

  async create(dto: CreateSupplierDto): Promise<SupplierDto> {
    const entity = this.repo.create({
      companyId: dto.companyId,
      nameAr: dto.nameAr,
      nameEn: dto.nameEn,
      contactName: dto.contactName ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
    });
    return this.toDto(await this.repo.save(entity));
  }

  async findAll(companyId?: string): Promise<SupplierDto[]> {
    const entities = await this.repo.find({
      where: companyId ? { companyId, active: true } : { active: true },
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
    if (dto.nameEn !== undefined) entity.nameEn = dto.nameEn;
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

  private toDto(e: Supplier): SupplierDto {
    const dto = new SupplierDto();
    dto.id = e.id;
    dto.companyId = e.companyId;
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
