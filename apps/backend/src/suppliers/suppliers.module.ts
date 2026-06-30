import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity.js';
import { SuppliersService } from './suppliers.service.js';
import { SuppliersController } from './suppliers.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier])],
  providers: [SuppliersService],
  controllers: [SuppliersController],
  exports: [SuppliersService],
})
export class SuppliersModule {}
