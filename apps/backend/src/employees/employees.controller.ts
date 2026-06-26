import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateEmployeeDto, EmployeeDto } from './dto/employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('employees')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Lister les employés' })
  @ApiResponse({ status: 200, type: [EmployeeDto] })
  findAll(): Promise<EmployeeDto[]> {
    return this.employeesService.findAll();
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
  update(@Param('id') id: string, @Body() dto: Partial<CreateEmployeeDto>): Promise<EmployeeDto> {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un employé' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.employeesService.remove(id);
  }
}
