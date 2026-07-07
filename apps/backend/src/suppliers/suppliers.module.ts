import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity.js';
import { SuppliersService } from './suppliers.service.js';
import { SuppliersController } from './suppliers.controller.js';
import { ProductSupplierPrice } from '../products/entities/product-supplier-price.entity.js';
import { Product } from '../products/entities/product.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier, ProductSupplierPrice, Product]),
  ],
  providers: [SuppliersService],
  controllers: [SuppliersController],
  exports: [SuppliersService],
})
export class SuppliersModule {}
