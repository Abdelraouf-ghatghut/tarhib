import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
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

  @ApiPropertyOptional({
    description: 'Commentaire libre de l employe (CDC §7 — panier)',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/**
 * Ligne de commande renvoyée par l'API : inclut la décision du moteur de
 * validation (§3.3) — le mobile affiche la raison de rejet par ligne.
 * Valeurs alignées sur LineValidationStatus (order-line.entity), redéclarées
 * ici en union pour éviter le cycle d'import dto ↔ entité.
 */
export class OrderLineDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'PENDING_APPROVAL'] })
  validationStatus!: 'APPROVED' | 'REJECTED' | 'PENDING_APPROVAL';

  @ApiProperty({ nullable: true, example: 'quotaExceeded' })
  rejectionReason!: string | null;
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

  @ApiProperty({
    nullable: true,
    description: 'Commentaire libre saisi par l employe a la commande',
  })
  note!: string | null;

  @ApiProperty({ type: () => [OrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines!: OrderLineDto[];
}
