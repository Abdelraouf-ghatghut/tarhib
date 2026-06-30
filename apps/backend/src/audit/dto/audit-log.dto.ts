import { ApiProperty } from '@nestjs/swagger';

export class AuditLogDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ nullable: true }) userEmail!: string | null;
  @ApiProperty() action!: string;
  @ApiProperty() entity!: string;
  @ApiProperty({ nullable: true }) entityId!: string | null;
  @ApiProperty({ nullable: true }) metadata!: Record<string, unknown> | null;
  @ApiProperty({ nullable: true }) ipAddress!: string | null;
  @ApiProperty() createdAt!: Date;
}

export class CreateAuditLogDto {
  userId!: string;
  userEmail?: string | null;
  action!: string;
  entity!: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}
