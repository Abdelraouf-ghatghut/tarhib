import { ApiProperty } from '@nestjs/swagger';

export type LineValidationDecision =
  | 'APPROVED'
  | 'REJECTED'
  | 'PENDING_APPROVAL';

export type LineRejectionReason =
  | 'PRODUCT_NOT_COMMANDABLE'
  | 'ROLE_NOT_ALLOWED'
  | 'INSUFFICIENT_STOCK'
  | 'QUOTA_EXCEEDED';

export class LineValidationResult {
  @ApiProperty()
  productId!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'PENDING_APPROVAL'] })
  decision!: LineValidationDecision;

  @ApiProperty({ required: false })
  reason?: LineRejectionReason;
}

export class CartValidationResult {
  @ApiProperty({ type: [LineValidationResult] })
  lines!: LineValidationResult[];

  @ApiProperty({ enum: ['APPROVED', 'PENDING_APPROVAL', 'PARTIALLY_REJECTED'] })
  overallDecision!: 'APPROVED' | 'PENDING_APPROVAL' | 'PARTIALLY_REJECTED';
}
