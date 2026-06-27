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
import { DepartmentsService } from './departments.service.js';
import { CreateDepartmentDto, DepartmentDto } from './dto/department.dto.js';

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  @ApiOperation({
    summary: 'Lister les départements (filtrable par companyId / branchId)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiResponse({ status: 200, type: [DepartmentDto] })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ): Promise<DepartmentDto[]> {
    return this.departmentsService.findAll(companyId, branchId);
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
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDepartmentDto>,
  ): Promise<DepartmentDto> {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Désactiver un département (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.departmentsService.remove(id);
  }
}
