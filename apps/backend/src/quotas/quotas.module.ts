import { Module } from '@nestjs/common';
import { QuotasService } from './quotas.service';
import { QuotasController } from './quotas.controller';

@Module({
  providers: [QuotasService],
  controllers: [QuotasController]
})
export class QuotasModule {}
