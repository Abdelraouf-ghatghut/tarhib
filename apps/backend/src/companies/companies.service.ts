import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity.js';
import { CompanyDto, CreateCompanyDto } from './dto/company.dto.js';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
  ) {}

  async create(dto: CreateCompanyDto): Promise<CompanyDto> {
    const entity = this.repo.create({ name: dto.name, slug: dto.slug });
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async findAll(): Promise<CompanyDto[]> {
    const entities = await this.repo.find({ order: { name: 'ASC' } });
    return entities.map((e) => this.toDto(e));
  }

  async findOne(id: string): Promise<CompanyDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Company ${id} not found`);
    return this.toDto(entity);
  }

  async update(
    id: string,
    dto: Partial<CreateCompanyDto>,
  ): Promise<CompanyDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Company ${id} not found`);
    Object.assign(entity, dto);
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
    dto.slug = e.slug;
    dto.active = e.active;
    return dto;
  }
}
