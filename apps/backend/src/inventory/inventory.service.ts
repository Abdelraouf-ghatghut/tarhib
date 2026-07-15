import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { InventoryItem, StockZone } from './entities/inventory-item.entity.js';
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
import { Branch } from '../branches/entities/branch.entity.js';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(InventoryItem)
    private readonly repo: Repository<InventoryItem>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateInventoryItemDto): Promise<InventoryItemDto> {
    const zone = dto.zone ?? StockZone.BRANCH;
    // Un emplacement VIP assigné à un employé précis est distinct de tout
    // autre emplacement du même produit/branche/zone — sans cette précision
    // dans la clé de doublon, le 2e employé VIP se verrait refuser la création.
    const existing = await this.repo.findOne({
      where: {
        companyId: dto.companyId,
        branchId: dto.branchId,
        productId: dto.productId,
        zone,
        departmentId: dto.departmentId ?? IsNull(),
        assignedEmployeeId: dto.assignedEmployeeId ?? IsNull(),
      },
    });
    if (existing) {
      throw new ConflictException('inventoryItemAlreadyExists');
    }
    const entity = this.repo.create({
      companyId: dto.companyId,
      branchId: dto.branchId,
      productId: dto.productId,
      zone,
      quantity: dto.quantity,
      minThreshold: dto.minThreshold ?? 0,
      maxThreshold: dto.maxThreshold ?? null,
      locationName: dto.locationName ?? null,
      departmentId: dto.departmentId ?? null,
      assignedEmployeeId: dto.assignedEmployeeId ?? null,
    });
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async findAll(
    companyId?: string,
    branchId?: string,
    zone?: StockZone,
  ): Promise<InventoryItemDto[]> {
    const where: FindOptionsWhere<InventoryItem> = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    if (zone) where.zone = zone;
    const entities = await this.repo.find({ where });
    return entities.map((e) => this.toDto(e));
  }

  async findBelowThreshold(
    companyId: string,
    branchId?: string,
    zone?: StockZone,
  ): Promise<InventoryItemDto[]> {
    const qb = this.repo
      .createQueryBuilder('i')
      .where('i.company_id = :companyId', { companyId })
      .andWhere('i.quantity <= i.min_threshold');
    if (branchId) qb.andWhere('i.branch_id = :branchId', { branchId });
    if (zone) qb.andWhere('i.zone = :zone', { zone });
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
    if (dto.locationName !== undefined) entity.locationName = dto.locationName;
    if (dto.departmentId !== undefined) entity.departmentId = dto.departmentId;
    if (dto.assignedEmployeeId !== undefined)
      entity.assignedEmployeeId = dto.assignedEmployeeId;
    const saved = await this.repo.save(entity);
    return this.toDto(saved);
  }

  async adjustAtomic(
    id: string,
    dto: InventoryAdjustmentDto,
  ): Promise<InventoryItemDto> {
    const saved = await this.repo.manager.transaction(async (manager) => {
      const inventory = manager.getRepository(InventoryItem);
      const entity = await inventory.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!entity) throw new NotFoundException(`InventoryItem ${id} not found`);
      if (dto.type === AdjustmentType.SORTIE) {
        if (entity.quantity < dto.quantity)
          throw new BadRequestException('insufficientInventoryStock');
        entity.quantity -= dto.quantity;
      } else {
        entity.quantity = dto.quantity;
      }
      return inventory.save(entity);
    });
    if (saved.quantity <= saved.minThreshold) {
      void this.notificationsService.notifyLowStock(
        saved.productId,
        saved.branchId,
        saved.quantity,
      );
      void this.notifyStockResponsible(saved);
    }
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
      entity.quantity = dto.quantity;
    }

    const saved = await this.repo.save(entity);

    if (saved.quantity <= saved.minThreshold) {
      this.notificationsService
        .notifyLowStock(saved.productId, saved.branchId, saved.quantity)
        .catch((err: unknown) =>
          this.logger.error(`Low-stock notification failed: ${String(err)}`),
        );

      // Notifie le responsable stock de la branche (s'il est configuré) pour
      // qu'il crée un bon de commande — première étape de la chaîne d'achat.
      this.notifyStockResponsible(saved).catch((err: unknown) =>
        this.logger.error(
          `Stock-responsible notification failed: ${String(err)}`,
        ),
      );
    }

    return this.toDto(saved);
  }

  private async notifyStockResponsible(item: InventoryItem): Promise<void> {
    const branch = await this.branchRepo.findOne({
      where: { id: item.branchId },
    });
    if (!branch?.stockResponsibleId) return;
    await this.notificationsService.notifyEmployee(
      branch.stockResponsibleId,
      'Stock bas — créer un bon de commande',
      `Produit ${item.productId.slice(0, 8).toUpperCase()} : ${item.quantity} unité(s) restante(s)`,
    );
  }

  /**
   * Utilisé par ProcurementService lors de la réception d'un bon de commande.
   * Ajoute qty au stock existant (zone=BRANCH), ou crée l'item s'il n'existe pas.
   */
  async addStockForReceipt(
    productId: string,
    branchId: string,
    companyId: string,
    qty: number,
  ): Promise<void> {
    let item = await this.repo.findOne({
      where: { productId, branchId, companyId, zone: StockZone.BRANCH },
    });
    if (item) {
      item.quantity += qty;
    } else {
      item = this.repo.create({
        productId,
        branchId,
        companyId,
        zone: StockZone.BRANCH,
        quantity: qty,
        minThreshold: 0,
        maxThreshold: null,
      });
    }
    await this.repo.save(item);
  }

  /** Used internally by OrdersService — checks zone=BRANCH stock */
  async findByBranchZone(
    productIds: string[],
    branchId: string,
    companyId: string,
  ): Promise<InventoryItem[]> {
    if (productIds.length === 0) return [];
    return this.repo.find({
      where: productIds.map((id) => ({
        productId: id,
        branchId,
        companyId,
        zone: StockZone.BRANCH,
      })),
    });
  }

  private toDto(e: InventoryItem): InventoryItemDto {
    const dto = new InventoryItemDto();
    dto.id = e.id;
    dto.companyId = e.companyId;
    dto.branchId = e.branchId;
    dto.productId = e.productId;
    dto.zone = e.zone;
    dto.quantity = e.quantity;
    dto.minThreshold = e.minThreshold;
    dto.maxThreshold = e.maxThreshold;
    dto.locationName = e.locationName;
    dto.departmentId = e.departmentId;
    dto.assignedEmployeeId = e.assignedEmployeeId;
    dto.belowThreshold = e.quantity <= e.minThreshold;
    return dto;
  }
}
