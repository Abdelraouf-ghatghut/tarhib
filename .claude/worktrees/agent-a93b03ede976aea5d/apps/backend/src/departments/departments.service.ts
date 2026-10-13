import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity.js';
import { DepartmentDto, CreateDepartmentDto } from './dto/department.dto.js';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly repo: Repository<Department>,
  ) {}

  async create(dto: CreateDepartmentDto): Promise<DepartmentDto> {
    const entity = this.repo.create({
      companyId: dto.companyId,
      branchId: dto.branchId,
      nameAr: dto.nameAr,
      nameEn: dto.nameEn,
    });
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async findAll(
    companyId?: string,
    branchId?: string,
  ): Promise<DepartmentDto[]> {
    const where: Partial<Department> = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    const entities = await this.repo.find({ where, order: { nameEn: 'ASC' } });
    return entities.map((e) => this.toDto(e));
  }

  async findOne(id: string): Promise<DepartmentDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Department ${id} not found`);
    return this.toDto(entity);
  }

  async update(
    id: string,
    dto: Partial<CreateDepartmentDto>,
  ): Promise<DepartmentDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Department ${id} not found`);
    if (dto.nameAr !== undefined) entity.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined) entity.nameEn = dto.nameEn;
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Department ${id} not found`);
    entity.active = false;
    await this.repo.save(entity);
  }

  private toDto(e: Department): DepartmentDto {
    const dto = new DepartmentDto();
    dto.id = e.id;
    dto.companyId = e.companyId;
    dto.branchId = e.branchId;
    dto.nameAr = e.nameAr;
    dto.nameEn = e.nameEn;
    dto.active = e.active;
    return dto;
  }
}
