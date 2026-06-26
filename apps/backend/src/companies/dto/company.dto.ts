import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsString, IsUUID, Matches, MinLength } from "class-validator";

export class CreateCompanyDto {
  @ApiProperty({ example: "Sonatrach SA" })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: "sonatrach-sa", description: "Identifiant URL-safe unique (kebab-case)" })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: "slug must only contain lowercase letters, digits and hyphens" })
  slug!: string;
}

export class CompanyDto {
  @ApiProperty({ example: "d290f1ee-6c54-4b01-90e6-d701748f0851" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "Sonatrach SA" })
  @IsString()
  name!: string;

  @ApiProperty({ example: "sonatrach-sa" })
  @IsString()
  slug!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  active!: boolean;
}
