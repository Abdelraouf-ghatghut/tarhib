import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateEmployeeDto, EmployeeDto } from './dto/employee.dto.js';
import { EmployeesService } from './employees.service.js';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un employé' })
  @ApiResponse({ status: 201, type: EmployeeDto })
  create(@Body() dto: CreateEmployeeDto): Promise<EmployeeDto> {
    return this.employeesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lister les employés (filtrable par companyId / branchId)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiResponse({ status: 200, type: [EmployeeDto] })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ): Promise<EmployeeDto[]> {
    return this.employeesService.findAll(companyId, branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un employé par ID' })
  @ApiResponse({ status: 200, type: EmployeeDto })
  findOne(@Param('id') id: string): Promise<EmployeeDto> {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un employé' })
  @ApiResponse({ status: 200, type: EmployeeDto })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateEmployeeDto>,
  ): Promise<EmployeeDto> {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Désactiver un employé (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.employeesService.remove(id);
  }
}
