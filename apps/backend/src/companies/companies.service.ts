import { Injectable, NotImplementedException } from '@nestjs/common';
import { CompanyDto, CreateCompanyDto } from './dto/company.dto';

@Injectable()
export class CompaniesService {
  create(_dto: CreateCompanyDto): Promise<CompanyDto> {
    throw new NotImplementedException();
  }

  findAll(): Promise<CompanyDto[]> {
    throw new NotImplementedException();
  }

  findOne(_id: string): Promise<CompanyDto> {
    throw new NotImplementedException();
  }

  update(_id: string, _dto: Partial<CreateCompanyDto>): Promise<CompanyDto> {
    throw new NotImplementedException();
  }

  remove(_id: string): Promise<void> {
    throw new NotImplementedException();
  }
}
