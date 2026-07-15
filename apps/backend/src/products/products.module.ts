import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { Product } from './entities/product.entity.js';
import { ProductFavorite } from './entities/product-favorite.entity.js';
import { InventoryItem } from '../inventory/entities/inventory-item.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductFavorite, InventoryItem]),
  ],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
