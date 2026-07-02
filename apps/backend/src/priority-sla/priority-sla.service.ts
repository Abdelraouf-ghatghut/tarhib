import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySlaLevel } from './entities/company-sla-level.entity.js';
import { SlaLevelDto, UpsertSlaLevelsDto } from './dto/sla-level.dto.js';
import { SlaPriority } from '../roles/entities/role.entity.js';

/** Durées SLA par défaut (minutes) quand l'entreprise n'a rien personnalisé. */
export const DEFAULT_SLA_MINUTES: Record<SlaPriority, number> = {
  [SlaPriority.P1]: 10,
  [SlaPriority.P2]: 20,
  [SlaPriority.P3]: 30,
  [SlaPriority.P4]: 45,
  [SlaPriority.P5]: 60,
};

const ALL_CODES = Object.values(SlaPriority);

@Injectable()
export class PrioritySlaService {
  constructor(
    @InjectRepository(CompanySlaLevel)
    private readonly levelRepo: Repository<CompanySlaLevel>,
  ) {}

  /** Retourne toujours les 5 niveaux : overrides de l'entreprise + défauts. */
  async getLevels(companyId: string): Promise<SlaLevelDto[]> {
    const overrides = await this.levelRepo.find({ where: { companyId } });
    return ALL_CODES.map((code) => {
      const custom = overrides.find((l) => l.code === code);
      return {
        code,
        nameAr: custom?.nameAr ?? null,
        nameEn: custom?.nameEn ?? null,
        targetMinutes: custom?.targetMinutes ?? DEFAULT_SLA_MINUTES[code],
        active: custom?.active ?? true,
        isDefault: !custom,
      };
    });
  }

  async setLevels(
    companyId: string,
    dto: UpsertSlaLevelsDto,
  ): Promise<SlaLevelDto[]> {
    const codes = dto.levels.map((l) => l.code);
    if (new Set(codes).size !== codes.length) {
      throw new BadRequestException('Duplicate SLA level codes');
    }
    if (!dto.levels.some((l) => l.active !== false)) {
      throw new BadRequestException(
        'At least one SLA level must remain active',
      );
    }

    for (const input of dto.levels) {
      const existing = await this.levelRepo.findOne({
        where: { companyId, code: input.code },
      });
      const level =
        existing ?? this.levelRepo.create({ companyId, code: input.code });
      level.nameAr = input.nameAr?.trim() || null;
      level.nameEn = input.nameEn?.trim() || null;
      level.targetMinutes = input.targetMinutes;
      level.active = input.active ?? true;
      await this.levelRepo.save(level);
    }
    return this.getLevels(companyId);
  }

  /** Durée SLA effective pour une commande (override entreprise sinon défaut). */
  async getSlaMinutes(
    companyId: string | undefined,
    code: SlaPriority,
  ): Promise<number> {
    if (companyId) {
      const custom = await this.levelRepo.findOne({
        where: { companyId, code },
      });
      if (custom) return custom.targetMinutes;
    }
    return DEFAULT_SLA_MINUTES[code];
  }
}
