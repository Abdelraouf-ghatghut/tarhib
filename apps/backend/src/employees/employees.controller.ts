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
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import {
  RequirePermission,
  RequireAnyPermission,
} from '../auth/decorators/require-permission.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { parsePagination } from '../common/pagination.js';
import {
  assertResourceScope,
  constrainRequestedScope,
} from '../common/access/request-scope.js';
import {
  CreateEmployeeDto,
  EmployeeAdminDto,
  EmployeeDto,
} from './dto/employee.dto.js';
import { EmployeesService } from './employees.service.js';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('admin')
  @UseGuards(PermissionsGuard)
  @RequirePermission('employee.salary.manage')
  @ApiOperation({
    summary: 'Liste admin (inclut salary) — réservée à employee.salary.manage',
  })
  @ApiResponse({ status: 200, type: [EmployeeAdminDto] })
  findAllAdmin(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('role') role?: string,
    @Query('active') active?: string,
    @Query('roleId') roleId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<EmployeeAdminDto[]> {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    const { skip, limit: take } = parsePagination(page, limit);
    return this.employeesService.findAllAdmin(
      scope.companyId,
      scope.branchId,
      departmentId,
      role,
      active,
      roleId,
      skip,
      take,
    );
  }

  @Post()
  @RequireAnyPermission('employee.manage', 'company.manage')
  @ApiOperation({ summary: 'Créer un employé' })
  @ApiResponse({ status: 201, type: EmployeeDto })
  create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<EmployeeDto> {
    return this.employeesService.create(dto, user.permissions);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lister les employés (filtrable par companyId, branchId, departmentId, role, active)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Filtrer par rôle legacy (chaîne libre, ex. EMPLOYEE)',
  })
  @ApiQuery({
    name: 'roleId',
    required: false,
    description: 'Filtrer par rôle dynamique (UUID)',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    description: 'Filtrer par statut actif: true ou false',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Défaut 1' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Défaut 200, max 500',
  })
  @ApiResponse({ status: 200, type: [EmployeeDto] })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('role') role?: string,
    @Query('active') active?: string,
    @Query('roleId') roleId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<EmployeeDto[]> {
    const scope = constrainRequestedScope(user, { companyId, branchId });
    const { skip, limit: take } = parsePagination(page, limit);
    return this.employeesService.findAll(
      scope.companyId,
      scope.branchId,
      departmentId,
      role,
      active,
      roleId,
      skip,
      take,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un employé par ID' })
  @ApiResponse({ status: 200, type: EmployeeDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<EmployeeDto> {
    const employee = await this.employeesService.findOne(id);
    assertResourceScope(user, {
      companyId: employee.companyId ?? '',
      branchId: employee.branchId ?? undefined,
    });
    return employee;
  }

  @Patch(':id')
  @RequireAnyPermission('employee.manage', 'company.manage')
  @ApiOperation({ summary: 'Mettre à jour un employé' })
  @ApiResponse({ status: 200, type: EmployeeDto })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateEmployeeDto>,
    @CurrentUser() user: JwtPayload,
  ): Promise<EmployeeDto> {
    return this.employeesService.update(id, dto, user.permissions);
  }

  @Delete(':id')
  @RequireAnyPermission('employee.manage', 'company.manage')
  @HttpCode(204)
  @ApiOperation({ summary: 'Désactiver un employé (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.employeesService.remove(id);
  }

  @Patch(':id/deactivate')
  @RequireAnyPermission('employee.manage', 'company.manage')
  @ApiOperation({
    summary:
      'Désactiver un compte employé (soft delete, révocation sessions) (TARHIB-32)',
  })
  @ApiResponse({ status: 200, type: EmployeeDto })
  deactivate(@Param('id') id: string): Promise<EmployeeDto> {
    return this.employeesService.deactivate(id);
  }
}
