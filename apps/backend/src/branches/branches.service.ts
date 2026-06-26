import { Injectable, NotImplementedException } from '@nestjs/common';
import { BranchDto, CreateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  create(_dto: CreateBranchDto): Promise<BranchDto> {
    throw new NotImplementedException();
  }

  findAll(): Promise<BranchDto[]> {
    throw new NotImplementedException();
  }

  findOne(_id: string): Promise<BranchDto> {
    throw new NotImplementedException();
  }

  update(_id: string, _dto: Partial<CreateBranchDto>): Promise<BranchDto> {
    throw new NotImplementedException();
  }

  remove(_id: string): Promise<void> {
    throw new NotImplementedException();
  }
}
