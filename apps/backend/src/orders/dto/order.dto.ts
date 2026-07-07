import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CreateOrderLineDto } from './create-order-line.dto';

export enum OrderStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  REJECTED = 'REJECTED',
}

export enum OrderPriority {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
  P5 = 'P5',
}

export class CreateOrderDto {
  @ApiProperty({ type: () => [CreateOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  lines!: CreateOrderLineDto[];
}

export class OrderDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0852' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0853' })
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0854' })
  @IsUUID()
  companyId!: string;

  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiProperty({
    description:
      'Code du niveau SLA hérité du rôle (défauts P1..P5 ou code personnalisé entreprise)',
  })
  @IsString()
  priority!: string;

  @ApiProperty({
    example: '2026-06-26T14:00:00.000Z',
    description: 'Recalculée en temps réel côté Agent',
  })
  @IsDateString()
  slaDeadline!: string;

  @ApiProperty({ example: '2026-06-26T12:00:00.000Z' })
  @IsDateString()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  approvedAt!: Date | null;

  @ApiProperty({ nullable: true })
  approvedBy!: string | null;

  @ApiProperty({ nullable: true })
  rejectedAt!: Date | null;

  @ApiProperty({ nullable: true })
  rejectedBy!: string | null;

  @ApiProperty({ nullable: true })
  prepStartedAt!: Date | null;

  @ApiProperty({ nullable: true })
  preparedBy!: string | null;

  @ApiProperty({ nullable: true })
  readyAt!: Date | null;

  @ApiProperty({ nullable: true })
  readyBy!: string | null;

  @ApiProperty({ nullable: true })
  deliveredAt!: Date | null;

  @ApiProperty({ nullable: true })
  deliveredBy!: string | null;

  @ApiProperty({ type: () => [CreateOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  lines!: CreateOrderLineDto[];
}
