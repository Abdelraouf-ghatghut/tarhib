import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import {
  VipReplenishmentTask,
  VipTaskStatus,
} from './entities/vip-replenishment-task.entity.js';
import { VipLocation } from './entities/vip-location.entity.js';
import { VipLocationProduct } from './entities/vip-location-product.entity.js';
import {
  AddVipLocationProductDto,
  AdjustVipLocationProductDto,
  CreateVipLocationDto,
  VipLocationDto,
  VipReplenishmentTaskDto,
} from './dto/vip-self-service.dto.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductType } from '../products/dto/product.dto.js';

@Injectable()
export class VipSelfServiceService {
  constructor(
    @InjectRepository(VipReplenishmentTask)
    private readonly taskRepo: Repository<VipReplenishmentTask>,
    @InjectRepository(VipLocation)
    private readonly locationRepo: Repository<VipLocation>,
    @InjectRepository(VipLocationProduct)
    private readonly locationProductRepo: Repository<VipLocationProduct>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  private async assertVipProducts(productIds: string[]): Promise<void> {
    const products = await this.productRepo.find({
      where: { id: In(productIds) },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('Un ou plusieurs produits sont introuvables');
    }
    if (products.some((p) => p.type !== ProductType.LIBRE_SERVICE_VIP)) {
      throw new BadRequestException('productNotVip');
    }
  }

  /**
   * Crée un lieu VIP (société + branche, optionnellement département et/ou
   * employé) avec au moins un produit initial. Plusieurs produits peuvent
   * partager le même lieu (ex. un frigo VIP avec plusieurs boissons).
   */
  async createLocation(dto: CreateVipLocationDto): Promise<VipLocationDto[]> {
    await this.assertVipProducts(dto.products.map((p) => p.productId));

    const location = await this.locationRepo.save(
      this.locationRepo.create({
        companyId: dto.companyId,
        branchId: dto.branchId,
        departmentId: dto.departmentId ?? null,
        assignedEmployeeId: dto.assignedEmployeeId ?? null,
        locationName: dto.locationName ?? null,
      }),
    );

    const items = await this.locationProductRepo.save(
      dto.products.map((p) =>
        this.locationProductRepo.create({
          vipLocationId: location.id,
          productId: p.productId,
          quantity: p.quantity,
          minThreshold: p.minThreshold ?? 0,
          maxThreshold: p.maxThreshold ?? null,
        }),
      ),
    );

    const products = await this.productRepo.find({
      where: { id: In(items.map((i) => i.productId)) },
    });
    return items.map((item) =>
      this.toLocationDto(
        item,
        location,
        products.find((p) => p.id === item.productId),
      ),
    );
  }

  /** Ajoute un produit à un lieu VIP existant. */
  async addProduct(
    vipLocationId: string,
    dto: AddVipLocationProductDto,
  ): Promise<VipLocationDto> {
    const location = await this.locationRepo.findOne({
      where: { id: vipLocationId },
    });
    if (!location)
      throw new NotFoundException(`Lieu ${vipLocationId} introuvable`);

    await this.assertVipProducts([dto.productId]);

    const existing = await this.locationProductRepo.findOne({
      where: { vipLocationId, productId: dto.productId },
    });
    if (existing) {
      throw new BadRequestException('productAlreadyInLocation');
    }

    const item = await this.locationProductRepo.save(
      this.locationProductRepo.create({
        vipLocationId,
        productId: dto.productId,
        quantity: dto.quantity,
        minThreshold: dto.minThreshold ?? 0,
        maxThreshold: dto.maxThreshold ?? null,
      }),
    );
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    return this.toLocationDto(item, location, product ?? undefined);
  }

  /** Retire un produit d'un lieu VIP (le lieu lui-même reste s'il a d'autres produits). */
  async removeProduct(vipLocationProductId: string): Promise<void> {
    const item = await this.locationProductRepo.findOne({
      where: { id: vipLocationProductId },
    });
    if (!item)
      throw new NotFoundException(
        `Produit ${vipLocationProductId} introuvable`,
      );
    await this.locationProductRepo.remove(item);
  }

  /**
   * Ajuste quantité/seuils d'un produit dans un lieu — remplace l'ancien
   * passage par InventoryService.adjust() : toutes les mutations de stock
   * VIP passent maintenant par ce module, ce qui garantit que
   * createTaskIfNeeded() est systématiquement appelé (plus de risque
   * d'oubli via un autre chemin d'écriture, cf. gap identifié avant cette
   * restructuration).
   */
  async adjustProduct(
    vipLocationProductId: string,
    dto: AdjustVipLocationProductDto,
  ): Promise<VipLocationDto> {
    const item = await this.locationProductRepo.findOne({
      where: { id: vipLocationProductId },
    });
    if (!item)
      throw new NotFoundException(
        `Produit ${vipLocationProductId} introuvable`,
      );
    const location = await this.locationRepo.findOne({
      where: { id: item.vipLocationId },
    });
    if (!location)
      throw new NotFoundException(`Lieu ${item.vipLocationId} introuvable`);

    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.minThreshold !== undefined) item.minThreshold = dto.minThreshold;
    if (dto.maxThreshold !== undefined) item.maxThreshold = dto.maxThreshold;
    const saved = await this.locationProductRepo.save(item);

    await this.createTaskIfNeeded(saved);

    const product = await this.productRepo.findOne({
      where: { id: saved.productId },
    });
    return this.toLocationDto(saved, location, product ?? undefined);
  }

  /**
   * Liste plate (1 ligne par produit) — contrat préservé pour l'app
   * mobile existante. `vipLocationId` (additif) permet au web-admin de
   * regrouper les lignes par lieu physique.
   */
  async getLocations(
    companyId?: string,
    branchId?: string,
    departmentId?: string,
  ): Promise<VipLocationDto[]> {
    const locWhere: FindOptionsWhere<VipLocation> = {};
    if (companyId) locWhere.companyId = companyId;
    if (branchId) locWhere.branchId = branchId;
    if (departmentId) locWhere.departmentId = departmentId;
    const locations = await this.locationRepo.find({ where: locWhere });
    if (locations.length === 0) return [];

    const locationIds = locations.map((l) => l.id);
    const items = await this.locationProductRepo.find({
      where: locationIds.map((id) => ({ vipLocationId: id })),
    });
    if (items.length === 0) return [];

    const products = await this.productRepo.find({
      where: { id: In([...new Set(items.map((i) => i.productId))]) },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const locationMap = new Map(locations.map((l) => [l.id, l]));

    const itemIds = items.map((i) => i.id);
    const openTasks =
      itemIds.length > 0
        ? await this.taskRepo.find({
            where: itemIds.flatMap((id) => [
              { vipLocationProductId: id, status: VipTaskStatus.OPEN },
              { vipLocationProductId: id, status: VipTaskStatus.IN_PROGRESS },
            ]),
          })
        : [];

    return items.map((item) => {
      const location = locationMap.get(item.vipLocationId)!;
      const openTask = openTasks.find(
        (t) => t.vipLocationProductId === item.id,
      );
      const dto = this.toLocationDto(
        item,
        location,
        productMap.get(item.productId),
      );
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
      throw new BadRequestException('vipTaskAlreadyCompleted');
    }

    const item = await this.locationProductRepo.findOne({
      where: { id: task.vipLocationProductId },
    });
    if (item && item.maxThreshold) {
      item.quantity = item.maxThreshold;
      await this.locationProductRepo.save(item);
    }

    task.status = VipTaskStatus.COMPLETED;
    task.completedBy = completedBy;
    task.completedAt = new Date();
    const saved = await this.taskRepo.save(task);
    return this.toTaskDto(saved);
  }

  /**
   * Appelé après toute mutation de quantité d'un produit VIP (adjustProduct,
   * et complete/replenish pour repartir sur une base saine). Crée une
   * tâche uniquement si aucune tâche OPEN/IN_PROGRESS n'existe déjà.
   */
  async createTaskIfNeeded(item: VipLocationProduct): Promise<void> {
    if (item.quantity > item.minThreshold) return;

    const existing = await this.taskRepo.findOne({
      where: [
        { vipLocationProductId: item.id, status: VipTaskStatus.OPEN },
        { vipLocationProductId: item.id, status: VipTaskStatus.IN_PROGRESS },
      ],
    });
    if (existing) return; // tâche déjà ouverte

    const location = await this.locationRepo.findOne({
      where: { id: item.vipLocationId },
    });
    if (!location) return;

    const requestedQty = item.maxThreshold
      ? Math.max(0, item.maxThreshold - item.quantity)
      : item.minThreshold - item.quantity + 1;

    const task = this.taskRepo.create({
      vipLocationProductId: item.id,
      productId: item.productId,
      branchId: location.branchId,
      companyId: location.companyId,
      locationName: location.locationName,
      requestedQty,
      status: VipTaskStatus.OPEN,
    });
    await this.taskRepo.save(task);
  }

  /**
   * Endpoint legacy pour l'app mobile existante :
   * PATCH /vip-self-service/locations/:id/replenish
   * `:id` est un VipLocationProduct id — remet son stock au max et
   * complète sa/ses tâche(s) ouverte(s).
   */
  async replenishLocation(
    vipLocationProductId: string,
    completedBy: string,
  ): Promise<VipLocationDto> {
    const item = await this.locationProductRepo.findOne({
      where: { id: vipLocationProductId },
    });
    if (!item)
      throw new NotFoundException(`Location ${vipLocationProductId} not found`);
    const location = await this.locationRepo.findOne({
      where: { id: item.vipLocationId },
    });
    if (!location)
      throw new NotFoundException(`Lieu ${item.vipLocationId} introuvable`);

    if (item.maxThreshold) {
      item.quantity = item.maxThreshold;
      await this.locationProductRepo.save(item);
    }

    const openTasks = await this.taskRepo.find({
      where: [
        { vipLocationProductId, status: VipTaskStatus.OPEN },
        { vipLocationProductId, status: VipTaskStatus.IN_PROGRESS },
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

    const product = await this.productRepo.findOne({
      where: { id: item.productId },
    });
    const dto = this.toLocationDto(item, location, product ?? undefined);
    dto.belowThreshold = false;
    dto.openTaskId = null;
    return dto;
  }

  private toLocationDto(
    item: VipLocationProduct,
    location: VipLocation,
    product: Product | undefined,
  ): VipLocationDto {
    const dto = new VipLocationDto();
    dto.id = item.id;
    dto.vipLocationId = item.vipLocationId;
    dto.productId = item.productId;
    dto.productNameAr = product?.nameAr ?? '';
    dto.productNameEn = product?.nameEn ?? '';
    dto.locationName = location.locationName;
    dto.branchId = location.branchId;
    dto.companyId = location.companyId;
    dto.departmentId = location.departmentId;
    dto.assignedEmployeeId = location.assignedEmployeeId;
    dto.currentStock = item.quantity;
    dto.minThreshold = item.minThreshold;
    dto.maxThreshold = item.maxThreshold;
    dto.belowThreshold = item.quantity <= item.minThreshold;
    dto.openTaskId = null;
    return dto;
  }

  private toTaskDto(t: VipReplenishmentTask): VipReplenishmentTaskDto {
    const dto = new VipReplenishmentTaskDto();
    dto.id = t.id;
    dto.vipLocationProductId = t.vipLocationProductId;
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
