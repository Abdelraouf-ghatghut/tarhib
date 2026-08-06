import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../roles/entities/role.entity.js';
import { AccessPolicyService } from './access-policy.service.js';
import { AccessCacheService } from './access-cache.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  providers: [AccessPolicyService, AccessCacheService],
  exports: [AccessPolicyService, AccessCacheService],
})
export class AccessModule {}
