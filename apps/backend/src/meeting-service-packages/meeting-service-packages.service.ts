import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MeetingServicePackage,
  ServicePackageType,
} from './entities/meeting-service-package.entity';
import type { CreateMeetingServicePackageDto } from './dto/meeting-service-package.dto';
import type { UpdateMeetingServicePackageDto } from './dto/meeting-service-package.dto';

const DEFAULT_PACKAGES = [
  {
    nameAr: 'إفطار + خدمة',
    nameEn: 'Breakfast + service',
    descriptionAr: 'عصير، قهوة، كرواسون، خدمة تقديم كاملة',
    descriptionEn: 'Juice, coffee, croissant, full table service',
    type: ServicePackageType.BREAKFAST,
  },
  {
    nameAr: 'غداء + خدمة',
    nameEn: 'Lunch + service',
    descriptionAr: 'طبق رئيسي، حلوى، مشروبات، خدمة تقديم كاملة',
    descriptionEn: 'Main course, dessert, drinks, full table service',
    type: ServicePackageType.LUNCH,
  },
];

@Injectable()
export class MeetingServicePackagesService {
  constructor(
    @InjectRepository(MeetingServicePackage)
    private readonly repo: Repository<MeetingServicePackage>,
  ) {}

  async findByCompany(companyId: string): Promise<MeetingServicePackage[]> {
    const existing = await this.repo.find({
      where: { companyId, isActive: true },
      order: { type: 'ASC' },
    });

    // Auto-seed defaults on first access
    if (existing.length === 0) {
      const seeded = DEFAULT_PACKAGES.map((p) =>
        this.repo.create({ ...p, companyId }),
      );
      return this.repo.save(seeded);
    }

    return existing;
  }

  async findAll(companyId?: string): Promise<MeetingServicePackage[]> {
    const where: Record<string, unknown> = {};
    if (companyId) where['companyId'] = companyId;
    return this.repo.find({ where, order: { type: 'ASC', createdAt: 'ASC' } });
  }

  async create(
    dto: CreateMeetingServicePackageDto,
  ): Promise<MeetingServicePackage> {
    // Anglais optionnel : repli sur l'arabe (colonne non-null)
    return this.repo.save(
      this.repo.create({ ...dto, nameEn: dto.nameEn?.trim() || dto.nameAr }),
    );
  }

  async update(
    id: string,
    dto: UpdateMeetingServicePackageDto,
  ): Promise<MeetingServicePackage> {
    const pkg = await this.repo.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');
    Object.assign(pkg, dto);
    return this.repo.save(pkg);
  }

  async remove(id: string): Promise<void> {
    const pkg = await this.repo.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');
    await this.repo.remove(pkg);
  }
}
