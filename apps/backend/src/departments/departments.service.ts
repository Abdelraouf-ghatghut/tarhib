import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateDepartmentDto, DepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  create(_dto: CreateDepartmentDto): Promise<DepartmentDto> {
    throw new NotImplementedException();
  }

  findAll(): Promise<DepartmentDto[]> {
    throw new NotImplementedException();
  }

  findOne(_id: string): Promise<DepartmentDto> {
    throw new NotImplementedException();
  }

  update(_id: string, _dto: Partial<CreateDepartmentDto>): Promise<DepartmentDto> {
    throw new NotImplementedException();
  }

  remove(_id: string): Promise<void> {
    throw new NotImplementedException();
  }
}
