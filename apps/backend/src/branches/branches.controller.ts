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
import { BranchesService } from './branches.service.js';
import { BranchDto, CreateBranchDto } from './dto/branch.dto.js';

@ApiTags('branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @RequireAnyPermission('company.manage', 'branch.manage')
  @ApiOperation({ summary: 'Créer une branche' })
  @ApiResponse({ status: 201, type: BranchDto })
  create(@Body() dto: CreateBranchDto): Promise<BranchDto> {
    return this.branchesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les branches (filtrable par companyId)' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiResponse({ status: 200, type: [BranchDto] })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('companyId') companyId?: string,
  ): Promise<BranchDto[]> {
    const scope = constrainRequestedScope(user, { companyId });
    return this.branchesService.findAll(scope.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une branche par ID' })
  @ApiResponse({ status: 200, type: BranchDto })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<BranchDto> {
    const branch = await this.branchesService.findOne(id);
    assertResourceScope(user, { companyId: branch.companyId, branchId: id });
    return branch;
  }

  @Patch(':id')
  @RequireAnyPermission('company.manage', 'branch.manage')
  @ApiOperation({ summary: 'Mettre à jour une branche' })
  @ApiResponse({ status: 200, type: BranchDto })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateBranchDto>,
  ): Promise<BranchDto> {
    return this.branchesService.update(id, dto);
  }

  @Delete(':id')
  @RequireAnyPermission('company.manage', 'branch.manage')
  @HttpCode(204)
  @ApiOperation({ summary: 'Désactiver une branche (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.branchesService.remove(id);
  }
}
