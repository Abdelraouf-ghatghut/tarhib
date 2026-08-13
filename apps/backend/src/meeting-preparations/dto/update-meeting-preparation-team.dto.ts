import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class UpdateMeetingPreparationTeamDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  participantEmployeeIds!: string[];
}
