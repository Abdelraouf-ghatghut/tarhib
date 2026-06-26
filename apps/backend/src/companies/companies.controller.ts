import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CompanyDto, CreateCompanyDto } from './dto/company.dto';

@ApiTags('companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une société cliente (tenant)' })
  @ApiResponse({ status: 201, type: CompanyDto })
  create(@Body() dto: CreateCompanyDto): Promise<CompanyDto> {
    return this.companiesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les sociétés clientes' })
  @ApiResponse({ status: 200, type: [CompanyDto] })
  findAll(): Promise<CompanyDto[]> {
    return this.companiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une société par ID' })
  @ApiResponse({ status: 200, type: CompanyDto })
  findOne(@Param('id') id: string): Promise<CompanyDto> {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une société' })
  @ApiResponse({ status: 200, type: CompanyDto })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCompanyDto>): Promise<CompanyDto> {
    return this.companiesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une société' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.companiesService.remove(id);
  }
}
