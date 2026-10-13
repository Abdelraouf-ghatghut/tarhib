import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsString, IsUUID, MinLength } from "class-validator";

export class CreateBranchDto {
  @ApiProperty({ example: "d290f1ee-6c54-4b01-90e6-d701748f0854" })
  @IsUUID()
  companyId!: string;

  @ApiProperty({ example: "فرع الجزائر العاصمة" })
  @IsString()
  @MinLength(1)
  nameAr!: string;

  @ApiProperty({ example: "Algiers HQ" })
  @IsString()
  @MinLength(1)
  nameEn!: string;
}

export class BranchDto {
  @ApiProperty({ example: "d290f1ee-6c54-4b01-90e6-d701748f0851" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "d290f1ee-6c54-4b01-90e6-d701748f0854" })
  @IsUUID()
  companyId!: string;

  @ApiProperty({ example: "فرع الجزائر العاصمة" })
  @IsString()
  nameAr!: string;

  @ApiProperty({ example: "Algiers HQ" })
  @IsString()
  nameEn!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  active!: boolean;
}
