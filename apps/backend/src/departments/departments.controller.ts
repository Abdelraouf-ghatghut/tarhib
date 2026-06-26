import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, DepartmentDto } from './dto/department.dto';

@ApiTags('departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un département' })
  @ApiResponse({ status: 201, type: DepartmentDto })
  create(@Body() dto: CreateDepartmentDto): Promise<DepartmentDto> {
    return this.departmentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les départements' })
  @ApiResponse({ status: 200, type: [DepartmentDto] })
  findAll(): Promise<DepartmentDto[]> {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un département par ID' })
  @ApiResponse({ status: 200, type: DepartmentDto })
  findOne(@Param('id') id: string): Promise<DepartmentDto> {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un département' })
  @ApiResponse({ status: 200, type: DepartmentDto })
  update(@Param('id') id: string, @Body() dto: Partial<CreateDepartmentDto>): Promise<DepartmentDto> {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un département' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.departmentsService.remove(id);
  }
}
