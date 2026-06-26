import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateQuotaDto, QuotaDto } from './dto/quota.dto';
import { QuotasService } from './quotas.service';

@ApiTags('quotas')
@ApiBearerAuth()
@Controller('quotas')
export class QuotasController {
  constructor(private readonly quotasService: QuotasService) {}

  @Post()
  @ApiOperation({ summary: 'Définir un quota produit pour un employé' })
  @ApiResponse({ status: 201, type: QuotaDto })
  create(@Body() dto: CreateQuotaDto): Promise<QuotaDto> {
    return this.quotasService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les quotas' })
  @ApiResponse({ status: 200, type: [QuotaDto] })
  findAll(): Promise<QuotaDto[]> {
    return this.quotasService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un quota par ID' })
  @ApiResponse({ status: 200, type: QuotaDto })
  findOne(@Param('id') id: string): Promise<QuotaDto> {
    return this.quotasService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un quota' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string): Promise<void> {
    return this.quotasService.remove(id);
  }
}
