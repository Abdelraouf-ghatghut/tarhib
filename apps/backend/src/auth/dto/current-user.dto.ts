import { ApiProperty } from '@nestjs/swagger';
import { EmployeeRole } from '../../employees/dto/employee.dto';

export class CurrentUserDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  sub!: string;

  @ApiProperty({ example: 'agent@company.com' })
  email!: string;

  @ApiProperty({ enum: EmployeeRole })
  role!: EmployeeRole;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0854' })
  companyId!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0853' })
  branchId!: string;
}
