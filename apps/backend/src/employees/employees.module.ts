import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeesService } from './employees.service.js';
import { EmployeesController } from './employees.controller.js';
import { Employee } from './entities/employee.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { Role } from '../roles/entities/role.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Role]), AuthModule],
  providers: [EmployeesService],
  controllers: [EmployeesController],
  exports: [EmployeesService],
})
export class EmployeesModule {}
