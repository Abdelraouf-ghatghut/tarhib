import { ApiProperty } from "@nestjs/swagger";
import { IsUUID, IsInt, Min } from "class-validator";

export class CreateOrderLineDto {
  @ApiProperty({ example: "a1b2c3d4-..." })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;
}