import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity.js';
import {
  CompanyDto,
  CreateCompanyDto,
  UpdateCompanyDto,
} from './dto/company.dto.js';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
  ) {}

  async create(dto: CreateCompanyDto): Promise<CompanyDto> {
    const entity = this.repo.create({
      name: dto.nameEn, // nom canonique interne dérivé du nom anglais
      nameAr: dto.nameAr,
      nameEn: dto.nameEn,
      slug: dto.slug,
      active: dto.active ?? true,
    });
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async findAll(): Promise<CompanyDto[]> {
    const entities = await this.repo.find({ order: { nameEn: 'ASC' } });
    return entities.map((e) => this.toDto(e));
  }

  async findOne(id: string): Promise<CompanyDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Company ${id} not found`);
    return this.toDto(entity);
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<CompanyDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Company ${id} not found`);
    Object.assign(entity, dto);
    // Garder le nom canonique interne synchronisé avec le nom anglais
    if (dto.nameEn) entity.name = dto.nameEn;
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Company ${id} not found`);
    entity.active = false;
    await this.repo.save(entity);
  }

  private toDto(e: Company): CompanyDto {
    const dto = new CompanyDto();
    dto.id = e.id;
    dto.name = e.name;
    dto.nameAr = e.nameAr;
    dto.nameEn = e.nameEn;
    dto.slug = e.slug;
    dto.active = e.active;
    return dto;
  }
}
