import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import {
  PrioritySlaService,
  DEFAULT_SLA_MINUTES,
  FALLBACK_SLA_MINUTES,
} from './priority-sla.service.js';
import { CompanySlaLevel } from './entities/company-sla-level.entity.js';
import { Role, SlaPriority } from '../roles/entities/role.entity.js';

const mockRepo = () => ({
  create: jest.fn((v: unknown) => v),
  save: jest.fn((v: unknown) => Promise.resolve(v)),
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn(),
  remove: jest.fn(),
});

describe('PrioritySlaService', () => {
  let service: PrioritySlaService;
  let levelRepo: ReturnType<typeof mockRepo>;
  let roleRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrioritySlaService,
        { provide: getRepositoryToken(CompanySlaLevel), useFactory: mockRepo },
        { provide: getRepositoryToken(Role), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(PrioritySlaService);
    levelRepo = module.get(getRepositoryToken(CompanySlaLevel));
    roleRepo = module.get(getRepositoryToken(Role));
  });

  describe('getLevels', () => {
    it('auto-seeds 3 default levels (P1/P2/P3) when the company has none yet', async () => {
      levelRepo.find.mockResolvedValue([]);
      const levels = await service.getLevels('co-1');
      expect(levels).toHaveLength(3);
      expect(levels.map((l) => l.code)).toEqual(['P1', 'P2', 'P3']);
      expect(levelRepo.save).toHaveBeenCalled();
    });

    it('returns the company custom set as-is (unlimited, free codes)', async () => {
      levelRepo.find.mockResolvedValue([
        {
          code: 'VIP',
          nameAr: 'كبار الشخصيات',
          nameEn: null,
          targetMinutes: 5,
          active: true,
          sortOrder: 0,
        },
        {
          code: 'URGENT',
          nameAr: null,
          nameEn: 'Urgent',
          targetMinutes: 15,
          active: true,
          sortOrder: 1,
        },
      ]);
      const levels = await service.getLevels('co-1');
      expect(levels).toHaveLength(2);
      expect(levels[0].code).toBe('VIP');
      expect(levels.every((l) => !l.isDefault)).toBe(true);
    });
  });

  describe('setLevels', () => {
    it('accepts more than 5 custom levels', async () => {
      const levels = Array.from({ length: 8 }, (_, i) => ({
        code: `N${i + 1}`,
        targetMinutes: (i + 1) * 10,
      }));
      // 1er appel (existing) : rien encore ; 2e appel (getLevels final) :
      // simule les 8 niveaux tout juste enregistrés — évite le déclenchement
      // du seed par défaut (réservé aux entreprises réellement sans niveaux)
      levelRepo.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(levels.map((l) => ({ ...l, sortOrder: 0 })));
      await service.setLevels('co-1', { levels });
      expect(levelRepo.save).toHaveBeenCalledTimes(8);
    });

    it('rejects duplicate codes', async () => {
      await expect(
        service.setLevels('co-1', {
          levels: [
            { code: 'P1', targetMinutes: 10 },
            { code: 'P1', targetMinutes: 20 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a set with no active level', async () => {
      await expect(
        service.setLevels('co-1', {
          levels: [{ code: 'P1', targetMinutes: 10, active: false }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks removal of a level still referenced by a role', async () => {
      levelRepo.find.mockResolvedValue([
        { code: 'VIP', targetMinutes: 5 },
        { code: 'STD', targetMinutes: 30 },
      ]);
      roleRepo.find.mockResolvedValue([{ id: 'r1', slaPriority: 'VIP' }]);

      await expect(
        service.setLevels('co-1', {
          levels: [{ code: 'STD', targetMinutes: 30 }],
        }),
      ).rejects.toThrow(/VIP/);
      expect(levelRepo.remove).not.toHaveBeenCalled();
    });

    it('removes unreferenced levels absent from the payload', async () => {
      const std = { code: 'STD', targetMinutes: 30 };
      levelRepo.find.mockResolvedValueOnce([
        { code: 'OLD', targetMinutes: 99 },
        std,
      ]);
      roleRepo.find.mockResolvedValue([]);
      levelRepo.find.mockResolvedValue([std]);

      await service.setLevels('co-1', { levels: [std] });
      expect(levelRepo.remove).toHaveBeenCalledWith([
        expect.objectContaining({ code: 'OLD' }),
      ]);
    });
  });

  describe('getSlaMinutes', () => {
    it('uses the company custom level when present', async () => {
      levelRepo.findOne.mockResolvedValue({ code: 'VIP', targetMinutes: 5 });
      await expect(service.getSlaMinutes('co-1', 'VIP')).resolves.toBe(5);
    });

    it('falls back to platform defaults for P1..P5', async () => {
      levelRepo.findOne.mockResolvedValue(null);
      await expect(service.getSlaMinutes('co-1', 'P2')).resolves.toBe(
        DEFAULT_SLA_MINUTES[SlaPriority.P2],
      );
    });

    it('falls back to the generic default for unknown codes', async () => {
      levelRepo.findOne.mockResolvedValue(null);
      await expect(service.getSlaMinutes('co-1', 'GHOST')).resolves.toBe(
        FALLBACK_SLA_MINUTES,
      );
    });
  });
});
