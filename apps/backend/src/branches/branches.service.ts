import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity.js';
import { BranchDto, CreateBranchDto } from './dto/branch.dto.js';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly repo: Repository<Branch>,
  ) {}

  async create(dto: CreateBranchDto): Promise<BranchDto> {
    const entity = this.repo.create({
      companyId: dto.companyId,
      nameAr: dto.nameAr,
      nameEn: dto.nameEn?.trim() || null,
      stockResponsibleId: dto.stockResponsibleId ?? null,
      orderValidatorId: dto.orderValidatorId ?? null,
      purchasingManagerId: dto.purchasingManagerId ?? null,
    });
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async findAll(companyId?: string): Promise<BranchDto[]> {
    const where = companyId ? { companyId } : {};
    const entities = await this.repo.find({ where, order: { nameEn: 'ASC' } });
    return entities.map((e) => this.toDto(e));
  }

  async findOne(id: string): Promise<BranchDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Branch ${id} not found`);
    return this.toDto(entity);
  }

  async update(id: string, dto: Partial<CreateBranchDto>): Promise<BranchDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Branch ${id} not found`);
    if (dto.nameAr !== undefined) entity.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined) entity.nameEn = dto.nameEn?.trim() || null;
    if (dto.stockResponsibleId !== undefined)
      entity.stockResponsibleId = dto.stockResponsibleId ?? null;
    if (dto.orderValidatorId !== undefined)
      entity.orderValidatorId = dto.orderValidatorId ?? null;
    if (dto.purchasingManagerId !== undefined)
      entity.purchasingManagerId = dto.purchasingManagerId ?? null;
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Branch ${id} not found`);
    entity.active = false;
    await this.repo.save(entity);
  }

  private toDto(e: Branch): BranchDto {
    const dto = new BranchDto();
    dto.id = e.id;
    dto.companyId = e.companyId;
    dto.nameAr = e.nameAr;
    dto.nameEn = e.nameEn;
    dto.active = e.active;
    dto.stockResponsibleId = e.stockResponsibleId;
    dto.orderValidatorId = e.orderValidatorId;
    dto.purchasingManagerId = e.purchasingManagerId;
    return dto;
  }
}
