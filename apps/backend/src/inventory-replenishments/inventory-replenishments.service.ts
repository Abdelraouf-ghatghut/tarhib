import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockZone } from '../inventory/entities/inventory-item.entity.js';
import { InventoryTransfersService } from '../inventory-transfers/inventory-transfers.service.js';
import {
  InventoryReplenishmentRequest,
  ReplenishmentStatus,
} from './entities/inventory-replenishment.entity.js';
@Injectable()
export class InventoryReplenishmentsService {
  constructor(
    @InjectRepository(InventoryReplenishmentRequest)
    private readonly repo: Repository<InventoryReplenishmentRequest>,
    private readonly transfers: InventoryTransfersService,
  ) {}
  findAll(companyId?: string, branchId?: string) {
    return this.repo.find({
      where: branchId ? { branchId } : companyId ? { companyId } : {},
      order: { createdAt: 'DESC' },
    });
  }
  async findOne(id: string) {
    const request = await this.repo.findOne({ where: { id } });
    if (!request) throw new NotFoundException(`Replenishment ${id} not found`);
    return request;
  }
  create(
    input: {
      companyId: string;
      branchId: string;
      productId: string;
      requestedQty: number;
      note?: string;
    },
    requestedBy: string,
  ) {
    if (input.requestedQty <= 0)
      throw new BadRequestException('requestedQtyMustBePositive');
    return this.repo.save(
      this.repo.create({
        ...input,
        note: input.note ?? null,
        requestedBy,
        approvedBy: null,
        transferId: null,
        status: ReplenishmentStatus.REQUESTED,
      }),
    );
  }
  async approve(id: string, approvedBy: string) {
    const request = await this.findOne(id);
    if (request.status !== ReplenishmentStatus.REQUESTED)
      throw new BadRequestException('onlyRequestedCanBeApproved');
    const transfer = await this.transfers.create(
      {
        companyId: request.companyId,
        branchId: request.branchId,
        productId: request.productId,
        fromZone: StockZone.BRANCH,
        toZone: StockZone.KITCHEN,
        quantity: request.requestedQty,
        note: `Replenishment ${request.id}`,
      },
      approvedBy,
    );
    request.status = ReplenishmentStatus.APPROVED;
    request.approvedBy = approvedBy;
    request.transferId = transfer.id;
    return this.repo.save(request);
  }
  async fulfill(id: string, employeeId: string) {
    const request = await this.findOne(id);
    if (request.status !== ReplenishmentStatus.APPROVED || !request.transferId)
      throw new BadRequestException('onlyApprovedCanBeFulfilled');
    await this.transfers.confirm(request.transferId, employeeId);
    request.status = ReplenishmentStatus.FULFILLED;
    return this.repo.save(request);
  }
  async reject(id: string, employeeId: string, note?: string) {
    const request = await this.findOne(id);
    if (request.status !== ReplenishmentStatus.REQUESTED)
      throw new BadRequestException('onlyRequestedCanBeRejected');
    request.status = ReplenishmentStatus.REJECTED;
    request.approvedBy = employeeId;
    request.note = note?.trim() || request.note;
    return this.repo.save(request);
  }
}
