import { IsUUID } from 'class-validator';

export class AssignMeetingPreparationDto {
  @IsUUID()
  employeeId!: string;
}
