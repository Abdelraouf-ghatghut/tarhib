import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quota } from './entities/quota.entity.js';
import { CreateQuotaDto, QuotaDto, UpdateQuotaDto } from './dto/quota.dto.js';

@Injectable()
export class QuotasService {
  constructor(
    @InjectRepository(Quota)
    private readonly repo: Repository<Quota>,
  ) {}

  async create(dto: CreateQuotaDto): Promise<QuotaDto> {
    const entity = this.repo.create({
      employeeId: dto.employeeId,
      productId: dto.productId,
      companyId: dto.companyId,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      maxQuantity: dto.maxQuantity,
      usedQuantity: 0,
    });
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async findAll(companyId?: string, employeeId?: string): Promise<QuotaDto[]> {
    const where: Partial<Quota> = {};
    if (companyId) where.companyId = companyId;
    if (employeeId) where.employeeId = employeeId;
    const entities = await this.repo.find({ where });
    return entities.map((e) => this.toDto(e));
  }

  async findOne(id: string): Promise<QuotaDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Quota ${id} not found`);
    return this.toDto(entity);
  }

  async update(id: string, dto: UpdateQuotaDto): Promise<QuotaDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Quota ${id} not found`);
    if (dto.productId !== undefined) entity.productId = dto.productId;
    if (dto.periodStart !== undefined) entity.periodStart = dto.periodStart;
    if (dto.periodEnd !== undefined) entity.periodEnd = dto.periodEnd;
    if (dto.maxQuantity !== undefined) entity.maxQuantity = dto.maxQuantity;
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async incrementUsed(
    employeeId: string,
    productId: string,
    companyId: string,
    qty: number,
  ): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const quota = await this.repo
      .createQueryBuilder('q')
      .where('q.employee_id = :employeeId', { employeeId })
      .andWhere('q.product_id = :productId', { productId })
      .andWhere('q.company_id = :companyId', { companyId })
      .andWhere('q.period_start <= :today', { today })
      .andWhere('q.period_end >= :today', { today })
      .getOne();

    if (quota) {
      quota.usedQuantity += qty;
      await this.repo.save(quota);
    }
  }

  async remove(id: string): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Quota ${id} not found`);
    await this.repo.remove(entity);
  }

  private toDto(e: Quota): QuotaDto {
    const dto = new QuotaDto();
    dto.id = e.id;
    dto.employeeId = e.employeeId;
    dto.productId = e.productId;
    dto.companyId = e.companyId;
    dto.periodStart = e.periodStart;
    dto.periodEnd = e.periodEnd;
    dto.maxQuantity = e.maxQuantity;
    dto.usedQuantity = e.usedQuantity;
    return dto;
  }
}
