import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity.js';
import { EmployeeZoneAssignment } from './entities/employee-zone-assignment.entity.js';
import { OperationalZone } from './entities/operational-zone.entity.js';
import { OperationalZonesController } from './operational-zones.controller.js';
import { OperationalZonesService } from './operational-zones.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OperationalZone,
      EmployeeZoneAssignment,
      Employee,
    ]),
  ],
  controllers: [OperationalZonesController],
  providers: [OperationalZonesService],
  exports: [OperationalZonesService],
})
export class OperationalZonesModule {}
