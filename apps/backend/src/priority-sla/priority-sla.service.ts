import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CompanySlaLevel } from './entities/company-sla-level.entity.js';
import { SlaLevelDto, UpsertSlaLevelsDto } from './dto/sla-level.dto.js';
import { Role, SlaPriority } from '../roles/entities/role.entity.js';

/** Durées SLA par défaut (minutes) quand l'entreprise n'a rien personnalisé. */
export const DEFAULT_SLA_MINUTES: Record<SlaPriority, number> = {
  [SlaPriority.P1]: 10,
  [SlaPriority.P2]: 20,
  [SlaPriority.P3]: 30,
  [SlaPriority.P4]: 45,
  [SlaPriority.P5]: 60,
};

/** Durée appliquée quand un code ne correspond à aucun niveau connu. */
export const FALLBACK_SLA_MINUTES = 60;

@Injectable()
export class PrioritySlaService {
  constructor(
    @InjectRepository(CompanySlaLevel)
    private readonly levelRepo: Repository<CompanySlaLevel>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  /**
   * Niveaux de l'entreprise (nombre illimité, triés). Si elle n'a encore
   * rien configuré, retourne les 5 défauts P1..P5 marqués isDefault.
   */
  async getLevels(companyId: string): Promise<SlaLevelDto[]> {
    const levels = await this.levelRepo.find({
      where: { companyId },
      order: { sortOrder: 'ASC', targetMinutes: 'ASC' },
    });

    if (levels.length === 0) {
      return Object.entries(DEFAULT_SLA_MINUTES).map(
        ([code, targetMinutes], i) => ({
          code,
          nameAr: null,
          nameEn: null,
          targetMinutes,
          active: true,
          sortOrder: i,
          isDefault: true,
        }),
      );
    }

    return levels.map((l) => ({
      code: l.code,
      nameAr: l.nameAr,
      nameEn: l.nameEn,
      targetMinutes: l.targetMinutes,
      active: l.active,
      sortOrder: l.sortOrder,
      isDefault: false,
    }));
  }

  /**
   * Remplace intégralement le set de niveaux : upsert des codes présents,
   * suppression des codes absents (refusée si un rôle les référence).
   */
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

    const existing = await this.levelRepo.find({ where: { companyId } });
    const removed = existing.filter((l) => !codes.includes(l.code));

    if (removed.length) {
      const removedCodes = removed.map((l) => l.code);
      const usedBy = await this.roleRepo.find({
        where: { companyId, slaPriority: In(removedCodes) },
      });
      if (usedBy.length) {
        const used = [...new Set(usedBy.map((r) => r.slaPriority))];
        throw new BadRequestException(
          `SLA levels still referenced by roles: ${used.join(', ')}`,
        );
      }
      await this.levelRepo.remove(removed);
    }

    for (const [index, input] of dto.levels.entries()) {
      const level =
        existing.find((l) => l.code === input.code) ??
        this.levelRepo.create({ companyId, code: input.code });
      level.nameAr = input.nameAr?.trim() || null;
      level.nameEn = input.nameEn?.trim() || null;
      level.targetMinutes = input.targetMinutes;
      level.active = input.active ?? true;
      level.sortOrder = input.sortOrder ?? index;
      await this.levelRepo.save(level);
    }
    return this.getLevels(companyId);
  }

  /** Durée SLA effective pour une commande (niveau entreprise sinon défaut). */
  async getSlaMinutes(
    companyId: string | undefined,
    code: string,
  ): Promise<number> {
    if (companyId) {
      const custom = await this.levelRepo.findOne({
        where: { companyId, code },
      });
      if (custom) return custom.targetMinutes;
    }
    return DEFAULT_SLA_MINUTES[code as SlaPriority] ?? FALLBACK_SLA_MINUTES;
  }
}
