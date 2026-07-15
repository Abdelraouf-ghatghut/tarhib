import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quota } from './entities/quota.entity.js';
import { CreateQuotaDto, QuotaDto, UpdateQuotaDto } from './dto/quota.dto.js';
import { RoleQuota } from '../roles/entities/role-quota.entity.js';
import { EmployeeQuotaUsage } from '../roles/entities/employee-quota-usage.entity.js';

/**
 * Photo instantanée du quota d'un employé pour un produit — consommée par le
 * moteur de validation de commande (§3.3) et par GET /mobile/quotas.
 */
export interface QuotaSnapshot {
  employeeId: string;
  productId: string;
  maxQuantity: number;
  usedQuantity: number;
}

/** Sous-ensemble du JwtPayload nécessaire au calcul des quotas. */
export interface QuotaCaller {
  sub: string;
  roleId?: string | null;
  companyId?: string | null;
}

@Injectable()
export class QuotasService {
  constructor(
    @InjectRepository(Quota)
    private readonly repo: Repository<Quota>,
    @InjectRepository(RoleQuota)
    private readonly roleQuotaRepo: Repository<RoleQuota>,
    @InjectRepository(EmployeeQuotaUsage)
    private readonly quotaUsageRepo: Repository<EmployeeQuotaUsage>,
  ) {}

  /**
   * Quotas effectifs de l'appelant : système rôle-based (RoleQuota +
   * EmployeeQuotaUsage) en priorité, fallback legacy per-employee (Quota).
   * `productIds` omis = tous les produits sous quota (affichage catalogue).
   * Logique extraite d'OrdersService.buildQuotaSnapshots — source unique
   * pour le moteur de validation ET l'affichage mobile.
   */
  async snapshotsFor(
    caller: QuotaCaller,
    productIds?: string[],
  ): Promise<QuotaSnapshot[]> {
    const today = new Date().toISOString().slice(0, 10);
    const filterByProducts = !!productIds?.length;

    // New role-based quota system
    if (caller.roleId) {
      const roleQuotasQb = this.roleQuotaRepo
        .createQueryBuilder('rq')
        .where('rq.role_id = :roleId', { roleId: caller.roleId })
        .andWhere('rq.company_id = :companyId', {
          companyId: caller.companyId,
        });
      const usagesQb = this.quotaUsageRepo
        .createQueryBuilder('u')
        .where('u.employee_id = :empId', { empId: caller.sub })
        .andWhere('u.period_start <= :today', { today })
        .andWhere('u.period_end >= :today', { today });
      if (filterByProducts) {
        roleQuotasQb.andWhere('rq.product_id IN (:...productIds)', {
          productIds,
        });
        usagesQb.andWhere('u.product_id IN (:...productIds)', { productIds });
      }
      const [roleQuotas, usages] = await Promise.all([
        roleQuotasQb.getMany(),
        usagesQb.getMany(),
      ]);

      return roleQuotas.map((rq) => {
        const usage = usages.find((u) => u.productId === rq.productId);
        return {
          employeeId: caller.sub,
          productId: rq.productId,
          maxQuantity: rq.maxQuantity,
          usedQuantity: usage?.usedQuantity ?? 0,
        };
      });
    }

    // Legacy per-employee quotas fallback
    const legacyQb = this.repo
      .createQueryBuilder('q')
      .where('q.employee_id = :employeeId', { employeeId: caller.sub })
      .andWhere('q.period_start <= :today', { today })
      .andWhere('q.period_end >= :today', { today });
    if (filterByProducts) {
      legacyQb.andWhere('q.product_id IN (:...productIds)', { productIds });
    }
    const legacy = await legacyQb.getMany();

    return legacy.map((q) => ({
      employeeId: q.employeeId,
      productId: q.productId,
      maxQuantity: q.maxQuantity,
      usedQuantity: q.usedQuantity,
    }));
  }

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
