import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateQuotaDto, QuotaDto } from './dto/quota.dto';

@Injectable()
export class QuotasService {
  create(_dto: CreateQuotaDto): Promise<QuotaDto> {
    throw new NotImplementedException();
  }

  findAll(): Promise<QuotaDto[]> {
    throw new NotImplementedException();
  }

  findOne(_id: string): Promise<QuotaDto> {
    throw new NotImplementedException();
  }

  remove(_id: string): Promise<void> {
    throw new NotImplementedException();
  }
}
