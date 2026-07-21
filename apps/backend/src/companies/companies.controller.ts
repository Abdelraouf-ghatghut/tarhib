import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermission } from '../auth/decorators/require-permission.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { CompaniesService } from './companies.service';
import {
  CompanyDto,
  CreateCompanyDto,
  UpdateCompanyDto,
} from './dto/company.dto';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermission('company.manage')
  @ApiOperation({ summary: 'Créer une société cliente (tenant)' })
  @ApiResponse({ status: 201, type: CompanyDto })
  create(@Body() dto: CreateCompanyDto): Promise<CompanyDto> {
    return this.companiesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lister les sociétés clientes — restreint à la société de l’appelant hors portée GLOBAL (company.manage)',
  })
  @ApiResponse({ status: 200, type: [CompanyDto] })
  async findAll(@CurrentUser() user: JwtPayload): Promise<CompanyDto[]> {
    if (user.dataScope === 'GLOBAL') return this.companiesService.findAll();
    const own = await this.companiesService.findOne(user.companyId);
    return [own];
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une société par ID' })
  @ApiResponse({ status: 200, type: CompanyDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<CompanyDto> {
    if (user.dataScope !== 'GLOBAL' && id !== user.companyId) {
      throw new ForbiddenException('Company is outside the current data scope');
    }
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('company.manage')
  @ApiOperation({ summary: 'Mettre à jour une société' })
  @ApiResponse({ status: 200, type: CompanyDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyDto> {
    return this.companiesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermission('company.manage')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprimer une société' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.companiesService.remove(id);
  }
}
