import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CleaningProduct } from '../cleaning-products/entities/cleaning-product.entity.js';
import { CleaningStockItem } from './entities/cleaning-stock-item.entity.js';
import {
  CleaningStockRequest,
  CleaningStockRequestStatus,
} from './entities/cleaning-stock-request.entity.js';
import { CreateCleaningStockRequestDto } from './dto/cleaning-stock.dto.js';
@Injectable()
export class CleaningStockService {
  constructor(
    @InjectRepository(CleaningProduct)
    private products: Repository<CleaningProduct>,
    @InjectRepository(CleaningStockItem)
    private stock: Repository<CleaningStockItem>,
    @InjectRepository(CleaningStockRequest)
    private requests: Repository<CleaningStockRequest>,
  ) {}
  listProducts() {
    return this.products.find({
      where: { active: true },
      order: { nameEn: 'ASC' },
    });
  }
  listStock(companyId?: string, branchId?: string) {
    return this.stock.find({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(branchId ? { branchId } : {}),
      },
      order: { createdAt: 'ASC' },
    });
  }
  listRequests(companyId?: string, branchId?: string) {
    return this.requests.find({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(branchId ? { branchId } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }
  async oneRequest(id: string) {
    const request = await this.requests.findOne({ where: { id } });
    if (!request)
      throw new NotFoundException(`Cleaning stock request ${id} not found`);
    return request;
  }
  createRequest(dto: CreateCleaningStockRequestDto, userId: string) {
    return this.requests.save(
      this.requests.create({
        ...dto,
        requestedBy: userId,
        status: CleaningStockRequestStatus.REQUESTED,
        note: dto.note?.trim() || null,
      }),
    );
  }
  async transition(id: string, status: CleaningStockRequestStatus) {
    const request = await this.oneRequest(id);
    const allowed: Record<
      CleaningStockRequestStatus,
      CleaningStockRequestStatus[]
    > = {
      REQUESTED: [
        CleaningStockRequestStatus.APPROVED,
        CleaningStockRequestStatus.REJECTED,
      ],
      APPROVED: [
        CleaningStockRequestStatus.FULFILLED,
        CleaningStockRequestStatus.REJECTED,
      ],
      FULFILLED: [],
      REJECTED: [],
    };
    if (!allowed[request.status].includes(status))
      throw new BadRequestException('invalidCleaningStockRequestTransition');
    request.status = status;
    return this.requests.save(request);
  }
}
