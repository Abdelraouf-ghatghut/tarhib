import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
export class CreateCleaningStockRequestDto {
  @IsUUID() companyId!: string;
  @IsUUID() branchId!: string;
  @IsUUID() cleaningProductId!: string;
  @IsInt() @Min(1) requestedQty!: number;
  @IsString() @IsOptional() note?: string;
}
export class AdjustCleaningStockDto {
  @IsInt() quantity!: number;
  @IsString() @IsOptional() reason?: string;
}
