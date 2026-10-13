import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity.js';
import {
  CreateInventoryItemDto,
  InventoryItemDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto.js';
import {
  AdjustmentType,
  InventoryAdjustmentDto,
} from './dto/inventory-adjustment.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(InventoryItem)
    private readonly repo: Repository<InventoryItem>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateInventoryItemDto): Promise<InventoryItemDto> {
    const existing = await this.repo.findOne({
      where: {
        companyId: dto.companyId,
        branchId: dto.branchId,
        productId: dto.productId,
      },
    });
    if (existing) {
      throw new ConflictException(
        'Inventory item already exists for this product/branch. Use PATCH to update.',
      );
    }
    const entity = this.repo.create({
      companyId: dto.companyId,
      branchId: dto.branchId,
      productId: dto.productId,
      quantity: dto.quantity,
      minThreshold: dto.minThreshold ?? 0,
      maxThreshold: dto.maxThreshold ?? null,
    });
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async findAll(
    companyId?: string,
    branchId?: string,
  ): Promise<InventoryItemDto[]> {
    const where: FindOptionsWhere<InventoryItem> = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    const entities = await this.repo.find({ where });
    return entities.map((e) => this.toDto(e));
  }

  async findBelowThreshold(
    companyId: string,
    branchId?: string,
  ): Promise<InventoryItemDto[]> {
    const qb = this.repo
      .createQueryBuilder('i')
      .where('i.company_id = :companyId', { companyId })
      .andWhere('i.quantity <= i.min_threshold');
    if (branchId) qb.andWhere('i.branch_id = :branchId', { branchId });
    const entities = await qb.getMany();
    return entities.map((e) => this.toDto(e));
  }

  async findOne(id: string): Promise<InventoryItemDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`InventoryItem ${id} not found`);
    return this.toDto(entity);
  }

  async update(
    id: string,
    dto: UpdateInventoryItemDto,
  ): Promise<InventoryItemDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`InventoryItem ${id} not found`);
    if (dto.quantity !== undefined) entity.quantity = dto.quantity;
    if (dto.minThreshold !== undefined) entity.minThreshold = dto.minThreshold;
    if (dto.maxThreshold !== undefined) entity.maxThreshold = dto.maxThreshold;
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async adjust(
    id: string,
    dto: InventoryAdjustmentDto,
  ): Promise<InventoryItemDto> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`InventoryItem ${id} not found`);

    if (dto.type === AdjustmentType.SORTIE) {
      const newQuantity = entity.quantity - dto.quantity;
      if (newQuantity < 0) {
        throw new BadRequestException(
          `Stock insuffisant : impossible de retirer ${dto.quantity} unités (stock actuel : ${entity.quantity})`,
        );
      }
      entity.quantity = newQuantity;
    } else {
      // AJUSTEMENT : fixe la valeur absolue (peut être 0)
      entity.quantity = dto.quantity;
    }

    const saved = await this.repo.save(entity);

    // Alerte seuil minimum — TARHIB-42, fire-and-forget
    if (saved.quantity <= saved.minThreshold) {
      this.notificationsService
        .notifyLowStock(saved.productId, saved.branchId, saved.quantity)
        .catch((err: unknown) =>
          this.logger.error(`Low-stock notification failed: ${String(err)}`),
        );
    }

    return this.toDto(saved);
  }

  private toDto(e: InventoryItem): InventoryItemDto {
    const dto = new InventoryItemDto();
    dto.id = e.id;
    dto.companyId = e.companyId;
    dto.branchId = e.branchId;
    dto.productId = e.productId;
    dto.quantity = e.quantity;
    dto.minThreshold = e.minThreshold;
    dto.maxThreshold = e.maxThreshold;
    dto.belowThreshold = e.quantity <= e.minThreshold;
    return dto;
  }
}
