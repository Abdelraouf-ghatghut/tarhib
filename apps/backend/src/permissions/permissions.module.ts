import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../roles/entities/permission.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { PermissionsService } from './permissions.service.js';
import { PermissionsController } from './permissions.controller.js';
import { PermissionsSeeder } from './permissions.seeder.js';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, Role])],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsSeeder],
  exports: [PermissionsService],
})
export class PermissionsModule {}
