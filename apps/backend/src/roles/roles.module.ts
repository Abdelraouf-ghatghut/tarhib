import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity.js';
import { Permission } from './entities/permission.entity.js';
import { RoleQuota } from './entities/role-quota.entity.js';
import { EmployeeQuotaUsage } from './entities/employee-quota-usage.entity.js';
import { Employee } from '../employees/entities/employee.entity.js';
import { MeetingRoom } from '../meeting-rooms/entities/meeting-room.entity.js';
import { RolesService } from './roles.service.js';
import { RolesController } from './roles.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Permission,
      RoleQuota,
      EmployeeQuotaUsage,
      Employee,
      MeetingRoom,
    ]),
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService, TypeOrmModule],
})
export class RolesModule {}
