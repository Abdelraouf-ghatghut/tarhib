import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { BranchDto, CreateBranchDto } from './dto/branch.dto';

@ApiTags('branches')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Lister les branches' })
  @ApiResponse({ status: 200, type: [BranchDto] })
  findAll(): Promise<BranchDto[]> {
    return this.branchesService.findAll();
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
  update(@Param('id') id: string, @Body() dto: Partial<CreateBranchDto>): Promise<BranchDto> {
    return this.branchesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une branche' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.branchesService.remove(id);
  }
}
