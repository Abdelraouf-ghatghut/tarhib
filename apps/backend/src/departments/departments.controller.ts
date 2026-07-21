import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { RequireAnyPermission } from '../auth/decorators/require-permission.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import {
  assertResourceScope,
  constrainRequestedScope,
} from '../common/access/request-scope.js';
import { DepartmentsService } from './departments.service.js';
import { CreateDepartmentDto, DepartmentDto } from './dto/department.dto.js';

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @RequireAnyPermission('company.manage', 'branch.manage')
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
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ): Promise<DepartmentDto[]> {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    return this.departmentsService.findAll(scope.companyId, scope.branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un département par ID' })
  @ApiResponse({ status: 200, type: DepartmentDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<DepartmentDto> {
    const department = await this.departmentsService.findOne(id);
    assertResourceScope(user, department);
    return department;
  }

  @Patch(':id')
  @RequireAnyPermission('company.manage', 'branch.manage')
  @ApiOperation({ summary: 'Mettre à jour un département' })
  @ApiResponse({ status: 200, type: DepartmentDto })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDepartmentDto>,
  ): Promise<DepartmentDto> {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @RequireAnyPermission('company.manage', 'branch.manage')
  @HttpCode(204)
  @ApiOperation({ summary: 'Désactiver un département (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.departmentsService.remove(id);
  }
}
