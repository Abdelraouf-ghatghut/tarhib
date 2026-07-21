import { IsString, MaxLength, MinLength } from 'class-validator';

export class OrderIssueDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  reason!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  description!: string;
}
