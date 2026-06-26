import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateEmployeeDto, EmployeeDto } from './dto/employee.dto';

@Injectable()
export class EmployeesService {
  create(_dto: CreateEmployeeDto): Promise<EmployeeDto> {
    throw new NotImplementedException();
  }

  findAll(): Promise<EmployeeDto[]> {
    throw new NotImplementedException();
  }

  findOne(_id: string): Promise<EmployeeDto> {
    throw new NotImplementedException();
  }

  update(_id: string, _dto: Partial<CreateEmployeeDto>): Promise<EmployeeDto> {
    throw new NotImplementedException();
  }

  remove(_id: string): Promise<void> {
    throw new NotImplementedException();
  }
}
