import { ApiProperty } from '@nestjs/swagger';
import { VipTaskStatus } from '../entities/vip-replenishment-task.entity.js';

export class VipLocationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  productNameAr!: string;

  @ApiProperty()
  productNameEn!: string;

  @ApiProperty({ nullable: true })
  locationName!: string | null;

  @ApiProperty()
  branchId!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  currentStock!: number;

  @ApiProperty()
  minThreshold!: number;

  @ApiProperty({ nullable: true })
  maxThreshold!: number | null;

  @ApiProperty()
  belowThreshold!: boolean;

  @ApiProperty({ nullable: true })
  openTaskId!: string | null;
}

export class VipReplenishmentTaskDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  inventoryItemId!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  branchId!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty({ nullable: true })
  locationName!: string | null;

  @ApiProperty()
  requestedQty!: number;

  @ApiProperty({ enum: VipTaskStatus })
  status!: VipTaskStatus;

  @ApiProperty({ nullable: true })
  assignedAgentId!: string | null;

  @ApiProperty({ nullable: true })
  completedBy!: string | null;

  @ApiProperty({ nullable: true })
  completedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}
