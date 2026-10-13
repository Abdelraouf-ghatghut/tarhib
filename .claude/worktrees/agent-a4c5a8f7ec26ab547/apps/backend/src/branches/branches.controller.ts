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
import { BranchesService } from './branches.service.js';
import { BranchDto, CreateBranchDto } from './dto/branch.dto.js';

@ApiTags('branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une branche' })
  @ApiResponse({ status: 201, type: BranchDto })
  create(@Body() dto: CreateBranchDto): Promise<BranchDto> {
    return this.branchesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les branches (filtrable par companyId)' })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiResponse({ status: 200, type: [BranchDto] })
  findAll(@Query('companyId') companyId?: string): Promise<BranchDto[]> {
    return this.branchesService.findAll(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une branche par ID' })
  @ApiResponse({ status: 200, type: BranchDto })
  findOne(@Param('id') id: string): Promise<BranchDto> {
    return this.branchesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une branche' })
  @ApiResponse({ status: 200, type: BranchDto })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateBranchDto>,
  ): Promise<BranchDto> {
    return this.branchesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Désactiver une branche (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.branchesService.remove(id);
  }
}
