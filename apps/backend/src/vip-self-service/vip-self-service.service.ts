import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  VipReplenishmentTask,
  VipTaskStatus,
} from './entities/vip-replenishment-task.entity.js';
import {
  VipLocationDto,
  VipReplenishmentTaskDto,
} from './dto/vip-self-service.dto.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductType } from '../products/dto/product.dto.js';

@Injectable()
export class VipSelfServiceService {
  constructor(
    @InjectRepository(VipReplenishmentTask)
    private readonly taskRepo: Repository<VipReplenishmentTask>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  /**
   * Retourne tous les emplacements VIP (InventoryItem dont le produit est LIBRE_SERVICE_VIP)
   * avec le statut de la tâche de réapprovisionnement ouverte éventuelle.
   */
  async getLocations(
    companyId?: string,
    branchId?: string,
  ): Promise<VipLocationDto[]> {
    // Charger tous les produits VIP
    const vipProducts = await this.productRepo.find({
      where: { type: ProductType.LIBRE_SERVICE_VIP, active: true },
    });
    if (vipProducts.length === 0) return [];

    const vipProductIds = vipProducts.map((p) => p.id);

    // Charger les items d'inventaire pour ces produits
    const where: FindOptionsWhere<InventoryItem>[] = vipProductIds.map(
      (id) => ({
        productId: id,
        ...(companyId ? { companyId } : {}),
        ...(branchId ? { branchId } : {}),
      }),
    );
    const items =
      where.length > 0 ? await this.inventoryRepo.find({ where }) : [];

    // Charger les tâches ouvertes pour ces items
    const itemIds = items.map((i) => i.id);
    const openTasks =
      itemIds.length > 0
        ? await this.taskRepo.find({
            where: itemIds.flatMap((id) => [
              { inventoryItemId: id, status: VipTaskStatus.OPEN },
              { inventoryItemId: id, status: VipTaskStatus.IN_PROGRESS },
            ]),
          })
        : [];

    const productMap = new Map(vipProducts.map((p) => [p.id, p]));

    return items.map((item) => {
      const product = productMap.get(item.productId);
      const openTask = openTasks.find((t) => t.inventoryItemId === item.id);
      const dto = new VipLocationDto();
      dto.id = item.id;
      dto.productId = item.productId;
      dto.productNameAr = product?.nameAr ?? '';
      dto.productNameEn = product?.nameEn ?? '';
      dto.locationName = item.locationName;
      dto.branchId = item.branchId;
      dto.companyId = item.companyId;
      dto.currentStock = item.quantity;
      dto.minThreshold = item.minThreshold;
      dto.maxThreshold = item.maxThreshold;
      dto.belowThreshold = item.quantity <= item.minThreshold;
      dto.openTaskId = openTask?.id ?? null;
      return dto;
    });
  }

  async getTasks(
    companyId?: string,
    branchId?: string,
    status?: VipTaskStatus,
  ): Promise<VipReplenishmentTaskDto[]> {
    const where: FindOptionsWhere<VipReplenishmentTask> = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    const tasks = await this.taskRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return tasks.map((t) => this.toTaskDto(t));
  }

  async completeTask(
    id: string,
    completedBy: string,
  ): Promise<VipReplenishmentTaskDto> {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    if (task.status === VipTaskStatus.COMPLETED) {
      throw new BadRequestException('Task already completed');
    }

    // Remettre le stock au maximum
    const item = await this.inventoryRepo.findOne({
      where: { id: task.inventoryItemId },
    });
    if (item && item.maxThreshold) {
      item.quantity = item.maxThreshold;
      await this.inventoryRepo.save(item);
    }

    task.status = VipTaskStatus.COMPLETED;
    task.completedBy = completedBy;
    task.completedAt = new Date();
    const saved = await this.taskRepo.save(task);
    return this.toTaskDto(saved);
  }

  /**
   * Appelé par InventoryService.adjust() quand le stock d'un item VIP passe sous le seuil.
   * Crée une tâche uniquement si aucune tâche OPEN/IN_PROGRESS n'existe déjà pour cet item.
   */
  async createTaskIfNeeded(item: InventoryItem): Promise<void> {
    const product = await this.productRepo.findOne({
      where: { id: item.productId },
    });
    if (!product || product.type !== ProductType.LIBRE_SERVICE_VIP) return;
    if (item.quantity > item.minThreshold) return;

    const existing = await this.taskRepo.findOne({
      where: [
        { inventoryItemId: item.id, status: VipTaskStatus.OPEN },
        { inventoryItemId: item.id, status: VipTaskStatus.IN_PROGRESS },
      ],
    });
    if (existing) return; // tâche déjà ouverte

    const requestedQty = item.maxThreshold
      ? Math.max(0, item.maxThreshold - item.quantity)
      : item.minThreshold - item.quantity + 1;

    const task = this.taskRepo.create({
      inventoryItemId: item.id,
      productId: item.productId,
      branchId: item.branchId,
      companyId: item.companyId,
      locationName: item.locationName,
      requestedQty,
      status: VipTaskStatus.OPEN,
    });
    await this.taskRepo.save(task);
  }

  /**
   * Endpoint legacy pour l'app mobile existante :
   * PATCH /vip-self-service/locations/:id/replenish
   * Remet le stock au max et complète la tâche ouverte.
   */
  async replenishLocation(
    locationId: string,
    completedBy: string,
  ): Promise<VipLocationDto> {
    const item = await this.inventoryRepo.findOne({
      where: { id: locationId },
    });
    if (!item) throw new NotFoundException(`Location ${locationId} not found`);

    if (item.maxThreshold) {
      item.quantity = item.maxThreshold;
      await this.inventoryRepo.save(item);
    }

    // Compléter toutes les tâches ouvertes pour cet emplacement
    const openTasks = await this.taskRepo.find({
      where: [
        { inventoryItemId: locationId, status: VipTaskStatus.OPEN },
        { inventoryItemId: locationId, status: VipTaskStatus.IN_PROGRESS },
      ],
    });
    for (const task of openTasks) {
      task.status = VipTaskStatus.COMPLETED;
      task.completedBy = completedBy;
      task.completedAt = new Date();
    }
    if (openTasks.length > 0) {
      await this.taskRepo.save(openTasks);
    }

    // Retourner la location mise à jour
    const product = await this.productRepo.findOne({
      where: { id: item.productId },
    });
    const dto = new VipLocationDto();
    dto.id = item.id;
    dto.productId = item.productId;
    dto.productNameAr = product?.nameAr ?? '';
    dto.productNameEn = product?.nameEn ?? '';
    dto.locationName = item.locationName;
    dto.branchId = item.branchId;
    dto.companyId = item.companyId;
    dto.currentStock = item.quantity;
    dto.minThreshold = item.minThreshold;
    dto.maxThreshold = item.maxThreshold;
    dto.belowThreshold = false;
    dto.openTaskId = null;
    return dto;
  }

  private toTaskDto(t: VipReplenishmentTask): VipReplenishmentTaskDto {
    const dto = new VipReplenishmentTaskDto();
    dto.id = t.id;
    dto.inventoryItemId = t.inventoryItemId;
    dto.productId = t.productId;
    dto.branchId = t.branchId;
    dto.companyId = t.companyId;
    dto.locationName = t.locationName;
    dto.requestedQty = t.requestedQty;
    dto.status = t.status;
    dto.assignedAgentId = t.assignedAgentId;
    dto.completedBy = t.completedBy;
    dto.completedAt = t.completedAt;
    dto.createdAt = t.createdAt;
    return dto;
  }
}
