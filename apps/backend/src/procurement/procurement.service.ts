import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from './entities/purchase-order.entity.js';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity.js';
import {
  CreatePurchaseOrderDto,
  PurchaseOrderDto,
  PurchaseOrderLineDto,
  ReceivePurchaseOrderDto,
  RejectPurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto/procurement.dto.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { Branch } from '../branches/entities/branch.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  InventoryItem,
  StockZone,
} from '../inventory/entities/inventory-item.entity.js';

@Injectable()
export class ProcurementService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderLine)
    private readonly lineRepo: Repository<PurchaseOrderLine>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly inventoryService: InventoryService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    dto: CreatePurchaseOrderDto,
    createdBy: string,
  ): Promise<PurchaseOrderDto> {
    const po = this.poRepo.create({
      companyId: dto.companyId,
      branchId: dto.branchId,
      supplierId: dto.supplierId,
      notes: dto.notes ?? null,
      createdBy,
      status: PurchaseOrderStatus.DRAFT,
      lines: dto.lines.map((l) =>
        this.lineRepo.create({
          productId: l.productId,
          orderedQty: l.orderedQty,
          receivedQty: 0,
          unitCost: l.unitCost ?? null,
          notes: l.notes ?? null,
        }),
      ),
    });
    const saved = await this.poRepo.save(po);
    return this.toDto(saved);
  }

  async findAll(
    companyId?: string,
    branchId?: string,
    status?: PurchaseOrderStatus,
  ): Promise<PurchaseOrderDto[]> {
    const where: FindOptionsWhere<PurchaseOrder> = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    const orders = await this.poRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return orders.map((o) => this.toDto(o));
  }

  async updateDraft(
    id: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderDto> {
    const po = await this.poRepo.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`PurchaseOrder ${id} not found`);
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('onlyDraftOrdersCanBeUpdated');
    }
    if (dto.supplierId !== undefined) po.supplierId = dto.supplierId;
    if (dto.notes !== undefined) po.notes = dto.notes.trim() || null;
    if (dto.lines !== undefined) {
      await this.lineRepo.delete({ purchaseOrderId: po.id });
      po.lines = dto.lines.map((line) =>
        this.lineRepo.create({
          purchaseOrderId: po.id,
          productId: line.productId,
          orderedQty: line.orderedQty,
          receivedQty: 0,
          unitCost: line.unitCost ?? null,
          notes: line.notes ?? null,
        }),
      );
    }
    return this.toDto(await this.poRepo.save(po));
  }

  async findOne(id: string): Promise<PurchaseOrderDto> {
    const po = await this.poRepo.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`PurchaseOrder ${id} not found`);
    return this.toDto(po);
  }

  /**
   * Soumet un bon de commande DRAFT pour validation — notifie le
   * validateur configuré sur la branche (sans effet si aucun n'est défini,
   * la chaîne de validation étant entièrement optionnelle).
   */
  async submit(id: string): Promise<PurchaseOrderDto> {
    const po = await this.poRepo.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`PurchaseOrder ${id} not found`);
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('onlyDraftOrdersCanBeSubmitted');
    }
    po.status = PurchaseOrderStatus.PENDING_VALIDATION;
    const saved = await this.poRepo.save(po);

    const branch = await this.branchRepo.findOne({
      where: { id: po.branchId },
    });
    if (branch?.orderValidatorId) {
      await this.notificationsService.notifyEmployee(
        branch.orderValidatorId,
        'Bon de commande à valider',
        `#${po.id.slice(0, 8).toUpperCase()} en attente de votre validation`,
      );
    }
    return this.toDto(saved);
  }

  /**
   * Valide un bon de commande PENDING_VALIDATION — notifie le responsable
   * achats configuré sur la branche pour qu'il achète et livre.
   */
  async validate(id: string, validatedBy: string): Promise<PurchaseOrderDto> {
    const po = await this.poRepo.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`PurchaseOrder ${id} not found`);
    if (po.status !== PurchaseOrderStatus.PENDING_VALIDATION) {
      throw new BadRequestException('onlyPendingOrdersCanBeValidated');
    }
    po.status = PurchaseOrderStatus.VALIDATED;
    po.validatedBy = validatedBy;
    po.validatedAt = new Date();
    const saved = await this.poRepo.save(po);

    const branch = await this.branchRepo.findOne({
      where: { id: po.branchId },
    });
    if (branch?.purchasingManagerId) {
      await this.notificationsService.notifyEmployee(
        branch.purchasingManagerId,
        'Bon de commande validé — à acheter',
        `#${po.id.slice(0, 8).toUpperCase()} validé, à acheter et livrer à la branche`,
      );
    }
    return this.toDto(saved);
  }

  /**
   * Rejette un bon de commande PENDING_VALIDATION — repart en DRAFT avec le
   * motif, et notifie son créateur (responsable stock).
   */
  async reject(
    id: string,
    dto: RejectPurchaseOrderDto,
    rejectedBy: string,
  ): Promise<PurchaseOrderDto> {
    const po = await this.poRepo.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`PurchaseOrder ${id} not found`);
    if (po.status !== PurchaseOrderStatus.PENDING_VALIDATION) {
      throw new BadRequestException('onlyPendingOrdersCanBeRejected');
    }
    po.status = PurchaseOrderStatus.DRAFT;
    po.rejectionReason = dto.reason;
    po.rejectedBy = rejectedBy;
    po.rejectedAt = new Date();
    const saved = await this.poRepo.save(po);

    // createdBy porte l'identité Keycloak de l'appelant (JwtPayload.sub),
    // pas employees.id (convention du code — cf. orders.employeeId) : on la
    // résout ici pour retrouver le vrai employé à notifier.
    const creator = await this.employeeRepo.findOne({
      where: { keycloakId: po.createdBy },
    });
    if (creator) {
      await this.notificationsService.notifyEmployee(
        creator.id,
        `Bon de commande #${po.id.slice(0, 8).toUpperCase()} rejeté`,
        dto.reason,
      );
    }
    return this.toDto(saved);
  }

  /**
   * Achat effectif : DRAFT (chaîne non configurée) ou VALIDATED peuvent
   * être envoyés au fournisseur.
   */
  async send(id: string, sentBy: string): Promise<PurchaseOrderDto> {
    const po = await this.poRepo.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`PurchaseOrder ${id} not found`);
    if (
      po.status !== PurchaseOrderStatus.DRAFT &&
      po.status !== PurchaseOrderStatus.VALIDATED
    ) {
      throw new BadRequestException('onlyDraftOrValidatedOrdersCanBeSent');
    }
    po.status = PurchaseOrderStatus.SENT;
    po.sentBy = sentBy;
    po.sentAt = new Date();
    return this.toDto(await this.poRepo.save(po));
  }

  async cancel(id: string, cancelledBy: string): Promise<PurchaseOrderDto> {
    const po = await this.poRepo.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`PurchaseOrder ${id} not found`);
    if (
      po.status === PurchaseOrderStatus.RECEIVED ||
      po.status === PurchaseOrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot cancel an already received or cancelled order',
      );
    }
    po.status = PurchaseOrderStatus.CANCELLED;
    po.cancelledBy = cancelledBy;
    po.cancelledAt = new Date();
    return this.toDto(await this.poRepo.save(po));
  }

  /**
   * Réception d'un bon de commande.
   * Pour chaque ligne réceptionnée : incrémente le stock BRANCH du produit.
   * Met à jour le statut du BdC (PARTIALLY_RECEIVED ou RECEIVED).
   */
  async receiveAtomic(
    id: string,
    dto: ReceivePurchaseOrderDto,
    receivedBy: string,
  ): Promise<PurchaseOrderDto> {
    return this.poRepo.manager.transaction(async (manager) => {
      const purchaseOrders = manager.getRepository(PurchaseOrder);
      const lines = manager.getRepository(PurchaseOrderLine);
      const inventory = manager.getRepository(InventoryItem);
      const po = await purchaseOrders.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!po) throw new NotFoundException(`PurchaseOrder ${id} not found`);
      if (po.status === PurchaseOrderStatus.RECEIVED) return this.toDto(po);
      if (po.status === PurchaseOrderStatus.CANCELLED)
        throw new BadRequestException('cancelledOrderCannotBeReceived');
      for (const reception of dto.lines) {
        const line = po.lines.find((item) => item.id === reception.lineId);
        if (!line || reception.receivedQty <= 0) continue;
        const quantity = Math.min(
          reception.receivedQty,
          line.orderedQty - line.receivedQty,
        );
        if (quantity <= 0) continue;
        line.receivedQty += quantity;
        await lines.save(line);
        let item = await inventory.findOne({
          where: {
            productId: line.productId,
            branchId: po.branchId,
            companyId: po.companyId,
            zone: StockZone.BRANCH,
          },
          lock: { mode: 'pessimistic_write' },
        });
        if (item) item.quantity += quantity;
        else
          item = inventory.create({
            productId: line.productId,
            branchId: po.branchId,
            companyId: po.companyId,
            zone: StockZone.BRANCH,
            quantity,
            minThreshold: 0,
            maxThreshold: null,
          });
        await inventory.save(item);
      }
      po.status = po.lines.every((line) => line.receivedQty >= line.orderedQty)
        ? PurchaseOrderStatus.RECEIVED
        : po.lines.some((line) => line.receivedQty > 0)
          ? PurchaseOrderStatus.PARTIALLY_RECEIVED
          : po.status;
      if (po.status === PurchaseOrderStatus.RECEIVED) {
        po.receivedBy = receivedBy;
        po.receivedAt = new Date();
      }
      return this.toDto(await purchaseOrders.save(po));
    });
  }

  async receive(
    id: string,
    dto: ReceivePurchaseOrderDto,
    receivedBy: string,
  ): Promise<PurchaseOrderDto> {
    const po = await this.poRepo.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`PurchaseOrder ${id} not found`);
    if (
      po.status === PurchaseOrderStatus.RECEIVED ||
      po.status === PurchaseOrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Order already fully received or cancelled',
      );
    }

    for (const reception of dto.lines) {
      const line = po.lines.find((l) => l.id === reception.lineId);
      if (!line) continue;
      if (reception.receivedQty <= 0) continue;

      const maxReceivable = line.orderedQty - line.receivedQty;
      const qty = Math.min(reception.receivedQty, maxReceivable);
      if (qty <= 0) continue;

      line.receivedQty += qty;
      await this.lineRepo.save(line);

      // Entrée stock automatique
      await this.inventoryService.addStockForReceipt(
        line.productId,
        po.branchId,
        po.companyId,
        qty,
      );
    }

    const allReceived = po.lines.every((l) => l.receivedQty >= l.orderedQty);
    const anyReceived = po.lines.some((l) => l.receivedQty > 0);

    po.status = allReceived
      ? PurchaseOrderStatus.RECEIVED
      : anyReceived
        ? PurchaseOrderStatus.PARTIALLY_RECEIVED
        : po.status;
    if (allReceived) {
      po.receivedBy = receivedBy;
      po.receivedAt = new Date();
    }

    const saved = await this.poRepo.save(po);
    return this.toDto(saved);
  }

  private toDto(o: PurchaseOrder): PurchaseOrderDto {
    const dto = new PurchaseOrderDto();
    dto.id = o.id;
    dto.companyId = o.companyId;
    dto.branchId = o.branchId;
    dto.supplierId = o.supplierId;
    dto.status = o.status;
    dto.notes = o.notes;
    dto.createdBy = o.createdBy;
    dto.validatedBy = o.validatedBy;
    dto.validatedAt = o.validatedAt;
    dto.rejectionReason = o.rejectionReason;
    dto.rejectedBy = o.rejectedBy;
    dto.rejectedAt = o.rejectedAt;
    dto.sentBy = o.sentBy;
    dto.sentAt = o.sentAt;
    dto.receivedBy = o.receivedBy;
    dto.receivedAt = o.receivedAt;
    dto.cancelledBy = o.cancelledBy;
    dto.cancelledAt = o.cancelledAt;
    dto.createdAt = o.createdAt;
    dto.updatedAt = o.updatedAt;
    dto.lines = (o.lines ?? []).map((l) => {
      const ld = new PurchaseOrderLineDto();
      ld.id = l.id;
      ld.productId = l.productId;
      ld.orderedQty = l.orderedQty;
      ld.receivedQty = l.receivedQty;
      ld.unitCost = l.unitCost ? Number(l.unitCost) : null;
      ld.notes = l.notes;
      return ld;
    });
    return dto;
  }
}
