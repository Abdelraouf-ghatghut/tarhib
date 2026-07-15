import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleaningProduct } from '../cleaning-products/entities/cleaning-product.entity.js';
import { CleaningStockController } from './cleaning-stock.controller.js';
import { CleaningStockService } from './cleaning-stock.service.js';
import { CleaningStockItem } from './entities/cleaning-stock-item.entity.js';
import { CleaningStockRequest } from './entities/cleaning-stock-request.entity.js';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CleaningProduct,
      CleaningStockItem,
      CleaningStockRequest,
    ]),
  ],
  controllers: [CleaningStockController],
  providers: [CleaningStockService],
})
export class CleaningStockModule {}
