import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../roles/entities/role.entity.js';
import { AccessPolicyService } from './access-policy.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  providers: [AccessPolicyService],
  exports: [AccessPolicyService],
})
export class AccessModule {}
