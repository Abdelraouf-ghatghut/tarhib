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
    const nameEn = dto.nameEn?.trim() || null;
    const entity = this.repo.create({
      // Nom canonique interne (unique, non-null) : dérivé de l'anglais si
      // fourni, sinon de l'arabe — jamais exposé tel quel côté UI.
      name: nameEn || dto.nameAr,
      nameAr: dto.nameAr,
      nameEn,
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
    if (dto.nameEn !== undefined) entity.nameEn = dto.nameEn?.trim() || null;
    // Garder le nom canonique interne (unique, non-null) synchronisé
    if (dto.nameEn !== undefined || dto.nameAr !== undefined)
      entity.name = entity.nameEn || entity.nameAr;
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
