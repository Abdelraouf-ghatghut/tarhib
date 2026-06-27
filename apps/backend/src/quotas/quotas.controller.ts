import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { CreateQuotaDto, QuotaDto } from './dto/quota.dto.js';
import { QuotasService } from './quotas.service.js';

@ApiTags('quotas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
  @ApiOperation({
    summary: 'Lister les quotas (filtrable par companyId / employeeId)',
  })
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiResponse({ status: 200, type: [QuotaDto] })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('employeeId') employeeId?: string,
  ): Promise<QuotaDto[]> {
    return this.quotasService.findAll(companyId, employeeId);
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
