import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import { AuditLogDto, CreateAuditLogDto } from './dto/audit-log.dto.js';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      const entry = this.repo.create({
        userId: dto.userId,
        userEmail: dto.userEmail ?? null,
        action: dto.action,
        entity: dto.entity,
        entityId: dto.entityId ?? null,
        metadata: dto.metadata ?? null,
        ipAddress: dto.ipAddress ?? null,
      });
      await this.repo.save(entry);
    } catch (err) {
      // Audit ne doit jamais bloquer la requête principale
      this.logger.error('Failed to write audit log', err);
    }
  }

  async findAll(filters: {
    entity?: string;
    userId?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: AuditLogDto[]; total: number }> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (filters.entity) where.entity = filters.entity;
    if (filters.userId) where.userId = filters.userId;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.startDate && filters.endDate) {
      where.createdAt = Between(
        new Date(filters.startDate),
        new Date(filters.endDate),
      );
    }

    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 200);
    const [logs, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: logs.map((l) => this.toDto(l)), total };
  }

  private toDto(e: AuditLog): AuditLogDto {
    return {
      id: e.id,
      userId: e.userId,
      userEmail: e.userEmail,
      action: e.action,
      entity: e.entity,
      entityId: e.entityId,
      metadata: e.metadata,
      ipAddress: e.ipAddress,
      createdAt: e.createdAt,
    };
  }
}
