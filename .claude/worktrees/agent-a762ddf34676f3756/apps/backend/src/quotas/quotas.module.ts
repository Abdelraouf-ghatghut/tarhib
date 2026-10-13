import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotasService } from './quotas.service.js';
import { QuotasController } from './quotas.controller.js';
import { Quota } from './entities/quota.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Quota])],
  providers: [QuotasService],
  controllers: [QuotasController],
  exports: [QuotasService],
})
export class QuotasModule {}
