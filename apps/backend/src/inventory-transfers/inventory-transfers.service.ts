import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import {
  InventoryTransfer,
  TransferStatus,
} from './entities/inventory-transfer.entity.js';
import {
  CreateInventoryTransferDto,
  InventoryTransferDto,
} from './dto/inventory-transfer.dto.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';

@Injectable()
export class InventoryTransfersService {
  constructor(
    @InjectRepository(InventoryTransfer)
    private readonly repo: Repository<InventoryTransfer>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,
  ) {}

  async create(
    dto: CreateInventoryTransferDto,
    requestedBy: string,
  ): Promise<InventoryTransferDto> {
    if (dto.fromZone === dto.toZone) {
      throw new BadRequestException('transferZonesMustDiffer');
    }

    const source = await this.inventoryRepo.findOne({
      where: {
        companyId: dto.companyId,
        branchId: dto.branchId,
        productId: dto.productId,
        zone: dto.fromZone,
      },
    });
    if (!source) {
      throw new NotFoundException(
        `Article de stock introuvable : produit=${dto.productId} zone=${dto.fromZone}`,
      );
    }
    if (source.quantity < dto.quantity) {
      throw new BadRequestException(
        `Stock insuffisant en ${dto.fromZone} : ${source.quantity} disponibles, ${dto.quantity} demandés`,
      );
    }

    const transfer = this.repo.create({
      companyId: dto.companyId,
      branchId: dto.branchId,
      productId: dto.productId,
      fromZone: dto.fromZone,
      toZone: dto.toZone,
      quantity: dto.quantity,
      status: TransferStatus.PENDING,
      requestedBy,
      note: dto.note ?? null,
    });
    const saved = await this.repo.save(transfer);
    return this.toDto(saved);
  }

  async findAll(
    companyId?: string,
    branchId?: string,
    status?: TransferStatus,
  ): Promise<InventoryTransferDto[]> {
    const where: FindOptionsWhere<InventoryTransfer> = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    const entities = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDto(e));
  }

  async findOne(id: string): Promise<InventoryTransferDto> {
    const transfer = await this.repo.findOne({ where: { id } });
    if (!transfer) throw new NotFoundException(`Transfer ${id} introuvable`);
    return this.toDto(transfer);
  }

  async confirmAtomic(
    id: string,
    confirmedBy: string,
  ): Promise<InventoryTransferDto> {
    return this.repo.manager.transaction(async (manager) => {
      const transfers = manager.getRepository(InventoryTransfer);
      const inventory = manager.getRepository(InventoryItem);
      const transfer = await transfers.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!transfer) throw new NotFoundException(`Transfer ${id} not found`);
      if (transfer.status === TransferStatus.CONFIRMED)
        return this.toDto(transfer);
      if (transfer.status !== TransferStatus.PENDING)
        throw new BadRequestException(`transferAlready${transfer.status}`);
      const source = await inventory.findOne({
        where: {
          companyId: transfer.companyId,
          branchId: transfer.branchId,
          productId: transfer.productId,
          zone: transfer.fromZone,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!source || source.quantity < transfer.quantity)
        throw new BadRequestException('insufficientTransferSourceStock');
      source.quantity -= transfer.quantity;
      await inventory.save(source);
      let destination = await inventory.findOne({
        where: {
          companyId: transfer.companyId,
          branchId: transfer.branchId,
          productId: transfer.productId,
          zone: transfer.toZone,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (destination) destination.quantity += transfer.quantity;
      else
        destination = inventory.create({
          companyId: transfer.companyId,
          branchId: transfer.branchId,
          productId: transfer.productId,
          zone: transfer.toZone,
          quantity: transfer.quantity,
          minThreshold: 0,
        });
      await inventory.save(destination);
      transfer.status = TransferStatus.CONFIRMED;
      transfer.confirmedBy = confirmedBy;
      transfer.confirmedAt = new Date();
      return this.toDto(await transfers.save(transfer));
    });
  }

  async confirm(
    id: string,
    confirmedBy: string,
  ): Promise<InventoryTransferDto> {
    const transfer = await this.repo.findOne({ where: { id } });
    if (!transfer) throw new NotFoundException(`Transfer ${id} introuvable`);
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException(`Ce transfert est déjà ${transfer.status}`);
    }

    // Vérification stock source à nouveau (peut avoir changé)
    const source = await this.inventoryRepo.findOne({
      where: {
        companyId: transfer.companyId,
        branchId: transfer.branchId,
        productId: transfer.productId,
        zone: transfer.fromZone,
      },
    });
    if (!source || source.quantity < transfer.quantity) {
      throw new BadRequestException(
        `Stock insuffisant en ${transfer.fromZone} pour confirmer le transfert`,
      );
    }

    // Décrémenter la source
    source.quantity -= transfer.quantity;
    await this.inventoryRepo.save(source);

    // Incrémenter ou créer la destination
    let dest = await this.inventoryRepo.findOne({
      where: {
        companyId: transfer.companyId,
        branchId: transfer.branchId,
        productId: transfer.productId,
        zone: transfer.toZone,
      },
    });
    if (dest) {
      dest.quantity += transfer.quantity;
    } else {
      dest = this.inventoryRepo.create({
        companyId: transfer.companyId,
        branchId: transfer.branchId,
        productId: transfer.productId,
        zone: transfer.toZone,
        quantity: transfer.quantity,
        minThreshold: 0,
      });
    }
    await this.inventoryRepo.save(dest);

    // Marquer le transfert confirmé
    transfer.status = TransferStatus.CONFIRMED;
    transfer.confirmedBy = confirmedBy;
    transfer.confirmedAt = new Date();
    const saved = await this.repo.save(transfer);
    return this.toDto(saved);
  }

  async cancel(id: string, cancelledBy: string): Promise<InventoryTransferDto> {
    const transfer = await this.repo.findOne({ where: { id } });
    if (!transfer) throw new NotFoundException(`Transfer ${id} introuvable`);
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException(
        `Seuls les transferts PENDING peuvent être annulés`,
      );
    }
    transfer.status = TransferStatus.CANCELLED;
    transfer.cancelledBy = cancelledBy;
    transfer.cancelledAt = new Date();
    const saved = await this.repo.save(transfer);
    return this.toDto(saved);
  }

  private toDto(e: InventoryTransfer): InventoryTransferDto {
    const dto = new InventoryTransferDto();
    dto.id = e.id;
    dto.companyId = e.companyId;
    dto.branchId = e.branchId;
    dto.productId = e.productId;
    dto.fromZone = e.fromZone;
    dto.toZone = e.toZone;
    dto.quantity = e.quantity;
    dto.status = e.status;
    dto.requestedBy = e.requestedBy;
    dto.confirmedBy = e.confirmedBy;
    dto.note = e.note;
    dto.createdAt = e.createdAt;
    dto.confirmedAt = e.confirmedAt;
    dto.cancelledBy = e.cancelledBy;
    dto.cancelledAt = e.cancelledAt;
    return dto;
  }
}
