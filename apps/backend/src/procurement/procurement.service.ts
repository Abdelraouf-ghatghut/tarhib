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
} from './dto/procurement.dto.js';
import { InventoryService } from '../inventory/inventory.service.js';

@Injectable()
export class ProcurementService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderLine)
    private readonly lineRepo: Repository<PurchaseOrderLine>,
    private readonly inventoryService: InventoryService,
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

  async findOne(id: string): Promise<PurchaseOrderDto> {
    const po = await this.poRepo.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`PurchaseOrder ${id} not found`);
    return this.toDto(po);
  }

  async send(id: string): Promise<PurchaseOrderDto> {
    const po = await this.poRepo.findOne({ where: { id } });
    if (!po) throw new NotFoundException(`PurchaseOrder ${id} not found`);
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT orders can be sent');
    }
    po.status = PurchaseOrderStatus.SENT;
    return this.toDto(await this.poRepo.save(po));
  }

  async cancel(id: string): Promise<PurchaseOrderDto> {
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
    return this.toDto(await this.poRepo.save(po));
  }

  /**
   * Réception d'un bon de commande.
   * Pour chaque ligne réceptionnée : incrémente le stock BRANCH du produit.
   * Met à jour le statut du BdC (PARTIALLY_RECEIVED ou RECEIVED).
   */
  async receive(
    id: string,
    dto: ReceivePurchaseOrderDto,
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
